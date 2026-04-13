import "dotenv/config";
import { Keypair } from "@stellar/stellar-sdk";
import { IdentityClient, CommerceClient, marcFetch, TESTNET, type MarcConfig } from "marc-stellar-sdk";

const cfg: MarcConfig = {
  rpcUrl: process.env.STELLAR_RPC_URL ?? TESTNET.rpcUrl,
  networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE ?? TESTNET.networkPassphrase,
  identityContract: process.env.AGENT_IDENTITY_CONTRACT || TESTNET.identityContract,
  commerceContract: process.env.AGENTIC_COMMERCE_CONTRACT || TESTNET.commerceContract,
  usdcToken: process.env.USDC_TOKEN_CONTRACT || TESTNET.usdcToken,
};

const buyer = Keypair.fromSecret(process.env.BUYER_SECRET!);

console.log(`\n=== BUYER DEMO ===`);
console.log(`Buyer: ${buyer.publicKey()}\n`);

// Step 1: Register agent identity
const identity = new IdentityClient(cfg);
let agentId = await identity.agentOf(buyer.publicKey());
if (!agentId) {
  agentId = await identity.register(buyer, "ipfs://buyer-metadata.json");
  console.log(`[1] Registered on-chain as agent #${agentId}`);
} else {
  console.log(`[1] Already registered as agent #${agentId}`);
}

// Step 2: Create escrow job
const commerce = new CommerceClient(cfg);
const budget = BigInt(10_000_000); // 1 USDC
const jobId = await commerce.createJob(
  buyer,
  sellerPubkey,
  buyer.publicKey(), // buyer acts as evaluator in demo
  cfg.usdcToken,
  budget,
  "Generate report via x402-protected endpoint",
);
console.log(`[2] Job created — id=${jobId}, budget=1 USDC locked in escrow`);

// Step 3: Call seller's paywalled API via marcFetch (auto-pays 402)
const paidFetch = marcFetch({ signer: buyer, rpcUrl: cfg.rpcUrl });
console.log(`[3] Calling seller API with auto-pay...`);
const res = await paidFetch(`http://localhost:${sellerPort}/api/work`);
const data = await res.json();
console.log(`    Response: ${JSON.stringify(data)}`);

// Step 4: Complete job (buyer=evaluator) → triggers 99/1 split
await commerce.complete(buyer, jobId);
const job = await commerce.getJob(jobId);
console.log(`[4] Job ${jobId} completed — status: ${job?.status}`);
console.log(`    99% released to seller, 1% to treasury\n`);
console.log(`=== BUYER DONE ===\n`);
