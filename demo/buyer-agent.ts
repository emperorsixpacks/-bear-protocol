import "dotenv/config";
import { Keypair } from "@stellar/stellar-sdk";
import {
  IdentityClient,
  CommerceClient,
  marcFetch,
  TESTNET,
  type MarcConfig,
} from "marc-stellar-sdk";

const cfg: MarcConfig = {
  rpcUrl: process.env.STELLAR_RPC_URL ?? TESTNET.rpcUrl,
  networkPassphrase:
    process.env.STELLAR_NETWORK_PASSPHRASE ?? TESTNET.networkPassphrase,
  identityContract:
    process.env.AGENT_IDENTITY_CONTRACT || TESTNET.identityContract,
  commerceContract:
    process.env.AGENTIC_COMMERCE_CONTRACT || TESTNET.commerceContract,
  usdcToken: process.env.USDC_TOKEN_CONTRACT || TESTNET.usdcToken,
};

const buyer = Keypair.fromSecret(process.env.BUYER_SECRET!);
const sellerPubkey = process.env.SELLER_PUBKEY!;
const sellerPort = Number(process.env.SELLER_PORT ?? 4402);
const NUM_CALLS = 3;

console.log(`[buyer] pubkey: ${buyer.publicKey()}`);

// --- Step 1: Register buyer on agent_identity ---
const identity = new IdentityClient(cfg);
let agentId = await identity.agentOf(buyer.publicKey());
if (!agentId) {
  agentId = await identity.register(buyer, "ipfs://buyer-metadata.json");
  console.log(`[buyer] registered as agent ${agentId}`);
} else {
  console.log(`[buyer] already registered as agent ${agentId}`);
}

// --- Step 2: Create a funded job ---
const commerce = new CommerceClient(cfg);
const budget = BigInt(10_000_000); // 1 USDC (7 decimals)
const jobId = await commerce.createJob(
  buyer,
  sellerPubkey,
  buyer.publicKey(), // buyer is also the evaluator for demo simplicity
  cfg.usdcToken,
  budget,
  "Generate 3 reports via x402-protected endpoint",
);
console.log(`[buyer] job created: id=${jobId} budget=${budget}`);

// --- Step 3: Hit seller's /api/work via marcFetch (auto-402) ---
const paidFetch = marcFetch({
  signer: buyer,
  rpcUrl: cfg.rpcUrl,
});

for (let i = 1; i <= NUM_CALLS; i++) {
  try {
    const res = await paidFetch(`http://localhost:${sellerPort}/api/work`);
    const data = await res.json();
    console.log(`[buyer] x402 call ${i}/${NUM_CALLS}: status=${res.status} ${JSON.stringify(data)}`);
  } catch (err) {
    console.error(`[buyer] x402 call ${i}/${NUM_CALLS} error:`, err instanceof Error ? err.message : err);
  }
}

// --- Step 4: Submit deliverable on behalf of seller (demo shortcut) ---
const sellerKp = Keypair.fromSecret(process.env.SELLER_SECRET!);
await commerce.submit(sellerKp, jobId, "ipfs://work-results.json");
console.log(`[buyer] submitted deliverable for job ${jobId}`);

// --- Step 5: Complete the job (buyer=evaluator) → 99/1 split ---
await commerce.complete(buyer, jobId);
const job = await commerce.getJob(jobId);
console.log(`[buyer] job ${jobId} completed — status: ${job?.status}`);
console.log("[buyer] DONE");
