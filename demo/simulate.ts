/**
 * Multi-agent marketplace simulation.
 *
 * 4 sellers register on-chain and start x402 paywall servers.
 * 5 buyers browse registered agents, each picks a seller, creates an escrow
 * job, pays via marcFetch, seller submits deliverable, buyer completes job.
 *
 * All keypairs are generated fresh and funded via Friendbot.
 * Requires only: USDC_TOKEN_CONTRACT (or falls back to TESTNET default).
 *
 * Run: npm run simulate
 */
import "dotenv/config";
import express from "express";
import { Keypair } from "@stellar/stellar-sdk";
import {
  IdentityClient,
  CommerceClient,
  marcPaywall,
  marcFetch,
  TESTNET,
  type MarcConfig,
  type Agent,
} from "marc-stellar-sdk";

const cfg: MarcConfig = {
  rpcUrl: process.env.STELLAR_RPC_URL ?? TESTNET.rpcUrl,
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE ?? TESTNET.networkPassphrase,
  identityContract: process.env.AGENT_IDENTITY_CONTRACT || TESTNET.identityContract,
  commerceContract: process.env.AGENTIC_COMMERCE_CONTRACT || TESTNET.commerceContract,
  usdcToken: process.env.USDC_TOKEN_CONTRACT || TESTNET.usdcToken,
};

const BASE_PORT = 4410;
const NUM_SELLERS = 4;
const NUM_BUYERS = 5;
const BUDGET = BigInt(10_000_000); // 1 USDC

function tag(role: string, i: number) {
  return `[${role}-${i}]`;
}

async function fundAccount(publicKey: string): Promise<void> {
  const res = await fetch(`https://friendbot.stellar.org?addr=${publicKey}`);
  if (!res.ok) throw new Error(`Friendbot failed for ${publicKey}: ${res.statusText}`);
}

async function fundUsdc(publicKey: string): Promise<void> {
  // Circle testnet USDC faucet
  const res = await fetch("https://faucet.circle.com/api/faucet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address: publicKey, blockchain: "stellar-testnet" }),
  });
  if (!res.ok) throw new Error(`USDC faucet failed for ${publicKey}: ${res.statusText}`);
}

// --- Fund all accounts in parallel ---
async function setupKeypairs(count: number, role: string): Promise<Keypair[]> {
  const kps = Array.from({ length: count }, () => Keypair.random());
  console.log(`\nFunding ${count} ${role} accounts...`);
  await Promise.all(kps.map(async (kp, i) => {
    await fundAccount(kp.publicKey());
    if (role === "buyer") await fundUsdc(kp.publicKey());
    console.log(`  ${tag(role, i + 1)} funded: ${kp.publicKey()}`);
  }));
  return kps;
}

// --- Seller: register + start paywall server ---
async function startSeller(kp: Keypair, index: number): Promise<{ agent: Agent; port: number }> {
  const t = tag("seller", index);
  const identity = new IdentityClient(cfg);
  const agentId = await identity.register(kp, `ipfs://seller-${index}-metadata.json`);
  const agent = (await identity.getAgent(agentId))!;
  console.log(`${t} registered as agent #${agentId}`);

  const port = BASE_PORT + index;
  const app = express();

  app.use("/api/work", marcPaywall({
    payTo: kp.publicKey(),
    price: "$0.01",
    network: "stellar:testnet",
    description: `Work from seller-${index}`,
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
    facilitatorApiKey: process.env.X402_FACILITATOR_API_KEY,
  }));

  app.get("/api/work", (_req, res) => {
    res.json({ result: `Report from seller-${index} at ${Date.now()}`, seller: kp.publicKey() });
  });

  await new Promise<void>((resolve) => app.listen(port, resolve));
  console.log(`${t} paywall listening on :${port}`);

  return { agent, port };
}

// --- Buyer: browse agents, pick seller, run full job lifecycle ---
async function runBuyer(
  kp: Keypair,
  index: number,
  sellers: { kp: Keypair; agent: Agent; port: number }[],
): Promise<void> {
  const t = tag("buyer", index);
  const identity = new IdentityClient(cfg);
  const commerce = new CommerceClient(cfg);

  // Register
  const agentId = await identity.register(kp, `ipfs://buyer-${index}-metadata.json`);
  console.log(`${t} registered as agent #${agentId}`);

  // Browse registered agents and pick one round-robin
  const allAgents = await identity.listAgents();
  console.log(`${t} found ${allAgents.length} agents on-chain`);

  const picked = sellers[(index - 1) % sellers.length];
  console.log(`${t} chose seller agent #${picked.agent.id} (${picked.agent.owner.slice(0, 8)}...)`);

  // Create escrow job
  const jobId = await commerce.createJob(
    kp,
    picked.agent.owner,
    kp.publicKey(), // buyer = evaluator in demo
    cfg.usdcToken,
    BUDGET,
    `Job from buyer-${index} to seller-${(index - 1) % sellers.length + 1}`,
  );
  console.log(`${t} job #${jobId} created — 1 USDC locked in escrow`);

  // Pay seller's API via x402
  const paidFetch = marcFetch({ signer: kp, rpcUrl: cfg.rpcUrl });
  const res = await paidFetch(`http://localhost:${picked.port}/api/work`);
  const data = await res.json();
  console.log(`${t} x402 call paid — response: ${JSON.stringify(data)}`);

  // Seller submits deliverable
  await commerce.submit(picked.kp, jobId, `ipfs://deliverable-job-${jobId}.json`);
  console.log(`${t} seller submitted deliverable for job #${jobId}`);

  // Buyer (evaluator) completes job → 99/1 split
  await commerce.complete(kp, jobId);
  const job = await commerce.getJob(jobId);
  console.log(`${t} job #${jobId} completed — status: ${job?.status} — 99% to seller, 1% fee`);
}

// --- Main ---
async function main() {
  console.log("=== MARC MARKETPLACE SIMULATION ===");
  console.log(`${NUM_SELLERS} sellers, ${NUM_BUYERS} buyers\n`);

  const [sellerKps, buyerKps] = await Promise.all([
    setupKeypairs(NUM_SELLERS, "seller"),
    setupKeypairs(NUM_BUYERS, "buyer"),
  ]);

  // Start all sellers in parallel
  console.log("\nRegistering sellers and starting paywall servers...");
  const sellerInfos = await Promise.all(
    sellerKps.map((kp, i) => startSeller(kp, i + 1).then((info) => ({ kp, ...info }))),
  );

  // Run all buyers in parallel
  console.log("\nRunning buyers...");
  await Promise.all(buyerKps.map((kp, i) => runBuyer(kp, i + 1, sellerInfos)));

  console.log("\n=== SIMULATION COMPLETE ===");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
