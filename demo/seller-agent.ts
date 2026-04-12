import "dotenv/config";
import express from "express";
import { Keypair } from "@stellar/stellar-sdk";
import {
  IdentityClient,
  marcPaywall,
  TESTNET,
  type MarcConfig,
} from "marc-stellar-sdk";

// Build config from TESTNET preset + env overrides.
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

const seller = Keypair.fromSecret(process.env.SELLER_SECRET!);
console.log(`[seller] pubkey: ${seller.publicKey()}`);

// --- Register on agent_identity if needed ---
const identity = new IdentityClient(cfg);
let agentId = await identity.agentOf(seller.publicKey());
if (!agentId) {
  agentId = await identity.register(seller, "ipfs://seller-metadata.json");
  console.log(`[seller] registered as agent ${agentId}`);
} else {
  console.log(`[seller] already registered as agent ${agentId}`);
}

// --- Express server with x402 paywall ---
const app = express();

app.use(
  "/api/work",
  marcPaywall({
    payTo: seller.publicKey(),
    amount: "100000", // 0.01 USDC (7 decimals)
    asset: cfg.usdcToken,
    network: "stellar-testnet",
    description: "One MARC-protected API call",
    facilitatorUrl: process.env.X402_FACILITATOR_URL,
    facilitatorApiKey: process.env.X402_FACILITATOR_API_KEY,
  }),
);

app.get("/api/work", (_req, res) => {
  res.json({
    result: `Generated report #${Date.now()}`,
    seller: seller.publicKey(),
  });
});

const port = Number(process.env.SELLER_PORT ?? 4402);
app.listen(port, () => console.log(`[seller] listening on :${port}`));
