# MARC on Stellar

**The commerce layer for AI agent payments on Stellar.**

Job escrow with delivery guarantees, on-chain agent identity, and HTTP 402 micropayments — all in one protocol built on Soroban.

Built for [Stellar Hacks: Agents 2026](https://stellarhacks.com) — **x402 x Stripe MPP track**.

---

## The Problem

AI agents need to transact with each other — pay for services, hire other agents, get paid for work — but there's no trustless infrastructure for this on Stellar. Today, agent-to-agent payments require manual coordination, no delivery guarantees, and no way to verify who you're transacting with.

## The Solution

MARC is a three-layer protocol that gives AI agents everything they need to transact trustlessly:

| Layer | What it does | Standard |
|---|---|---|
| **Agent Identity** | On-chain registry. Register, link metadata, build verifiable reputation. | ERC-8004 |
| **Agentic Commerce** | Escrow-based job marketplace. Lock funds → deliver → get paid. 1% fee. | ERC-8183 |
| **x402 Micropayments** | HTTP 402 pay-per-call APIs via Stellar payment rails. | x402 + MPP |

## What We Built (48 hours)

- 2 Soroban smart contracts (Rust → WASM, deployed on testnet)
- 19 contract unit tests (7 identity + 12 commerce)
- TypeScript SDK wrapping both contracts + x402 middleware
- Interactive dashboard (register agents, create jobs, full escrow lifecycle)
- CLI demo scripts for end-to-end verification
- Landing page with protocol documentation

---

## Demo

> **No wallet extension needed.** The dashboard uses pre-loaded testnet keypairs so judges can interact with the protocol immediately.

```
http://localhost:3000        → Landing page
http://localhost:3000/app    → Interactive dashboard
```

**Try the full lifecycle:**
1. Register an agent (on-chain identity in ~6s)
2. Create a job (USDC locked in escrow)
3. Submit deliverable (provider submits work)
4. Complete job (99% to provider, 1% fee to treasury)
5. Watch balances update in real time

<!-- TODO: Add demo video link or screenshots -->

---

## How It Works

```
  Client                    Contract                   Provider
    │                          │                          │
    │  1. create_job(budget)   │                          │
    │ ────────────────────────>│  USDC locked in escrow   │
    │                          │                          │
    │                          │  2. submit(deliverable)  │
    │                          │<─────────────────────────│
    │                          │                          │
    │  3. complete()           │                          │
    │ ────────────────────────>│  99% → Provider          │
    │                          │   1% → Treasury          │
    │                          │                          │
```

**Job States:** `Funded` → `Submitted` → `Completed` (or `Cancelled` from `Funded`)

---

## x402 + MPP Integration

MARC sits on top of Stellar's x402 and Machine-Payable Pages standards:

**Server (paywall):** Any agent can monetize its API with one line of middleware:
```typescript
import { marcPaywall } from "marc-stellar-sdk";

app.use("/api/work", marcPaywall({ price: 1_000_000, token: "USDC" }));
```

**Client (auto-pay):** Agents automatically detect 402 responses, pay, and retry:
```typescript
import { marcFetch } from "marc-stellar-sdk";

const res = await marcFetch("https://agent.example/api/work", {
  method: "POST",
  signer: keypair,
});
```

This implements the full x402 flow: `402 Payment Required` → read `X-PAYMENT-REQUIREMENTS` → sign Stellar tx → retry with `X-PAYMENT` header → access granted.

---

## Testnet Contracts (Live)

| Contract | Address |
|---|---|
| Agent Identity | `CAMPXYFZJTIPEVOPOAZPRG5OHXKNBDPGTPRCOIO4LVPGEM4TONPY65A5` |
| Agentic Commerce | `CD2KWU7IE74Z2QKVP3FQ67J46XHNMGIDTNKXVWE7ZNVRC7T6UH46GQXE` |
| Network | Stellar Testnet |

Verify live: `stellar contract invoke --id CAMPXYFZJTIPEVOPOAZPRG5OHXKNBDPGTPRCOIO4LVPGEM4TONPY65A5 --network testnet -- version`

---

## Architecture

```
marc-stellar/
├── contracts/
│   ├── agent-identity/       # Soroban contract — agent registry (4.2 KB WASM)
│   └── agentic-commerce/     # Soroban contract — job escrow (9.4 KB WASM)
├── sdk/                      # TypeScript SDK wrapping both contracts
│   └── src/
│       ├── identity.ts       # IdentityClient
│       ├── commerce.ts       # CommerceClient
│       ├── marcPaywall.ts    # Express x402 middleware
│       ├── marcFetch.ts      # Auto-paying fetch wrapper
│       └── types.ts          # Shared types + TESTNET config
├── demo/
│   ├── seller-agent.ts       # x402 paywall server
│   ├── buyer-agent.ts        # Job lifecycle + micropayments
│   └── lifecycle.ts          # Full end-to-end orchestrator
├── dashboard/
│   ├── server.ts             # Express API + static serving
│   ├── lib/config.ts         # Keypair + contract config
│   ├── lib/discovery.ts      # Sequential ID scanner for on-chain data
│   └── public/               # Dashboard SPA (HTML/CSS/JS)
├── landing/                  # Marketing landing page
└── scripts/
    ├── build.sh              # Build contracts + SDK
    └── deploy-testnet.sh     # Deploy to Stellar testnet
```

---

## Quick Start

### Prerequisites

- [Rust](https://rustup.rs/) 1.92+
- [stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install-cli) 25.x
- Node.js 20+

### 1. Clone & build

```bash
git clone https://github.com/mmhhmm/marc-stellar.git
cd marc-stellar

# Build Soroban contracts
./scripts/build.sh

# Build SDK
cd sdk && npm install && npm run build && cd ..
```

### 2. Set up environment

```bash
# Copy the example env (fill in BUYER_SECRET and SELLER_SECRET with funded testnet keypairs)
cp demo/.env.example demo/.env

# Generate funded testnet accounts if needed:
stellar keys generate buyer --network testnet --fund
stellar keys generate seller --network testnet --fund
```

### 3. Run the dashboard

```bash
cd dashboard
npm install
ln -s ../demo/.env .env
npx tsx server.ts
```

Open [http://localhost:3000](http://localhost:3000) for the landing page, or [http://localhost:3000/app](http://localhost:3000/app) for the interactive dashboard.

### 4. Run the CLI demo (optional)

```bash
cd demo && npm install

# Full lifecycle: register agents → create job → submit → complete → verify 99/1 split
npm run lifecycle
```

---

## SDK Usage

```typescript
import { IdentityClient, CommerceClient, TESTNET } from "marc-stellar-sdk";

// Register an agent
const identity = new IdentityClient(TESTNET);
const agentId = await identity.register(keypair, "ipfs://agent-metadata.json");

// Create an escrow job
const commerce = new CommerceClient(TESTNET);
const jobId = await commerce.createJob(
  clientKeypair,
  providerAddress,
  evaluatorAddress,
  TESTNET.usdcToken,
  10_000_000n, // 1 USDC (7 decimals)
  "Generate quarterly report"
);

// Provider submits work
await commerce.submit(providerKeypair, jobId, "ipfs://deliverable.json");

// Evaluator approves → 99% to provider, 1% fee
await commerce.complete(evaluatorKeypair, jobId);
```

---

## Contract API Reference

### Agent Identity

| Function | Auth | Description |
|---|---|---|
| `register(agent, uri)` | agent | Register agent, returns sequential ID |
| `get_agent(id)` | — | Get agent by ID |
| `agent_of(address)` | — | Lookup agent ID by Stellar address |
| `update_uri(id, uri)` | owner | Update metadata URI |
| `deregister(id)` | owner | Remove agent from registry |

### Agentic Commerce

| Function | Auth | Description |
|---|---|---|
| `init(admin, treasury)` | admin | One-time setup (1% fee, sequential IDs) |
| `create_job(client, provider, evaluator, token, budget, desc)` | client | Lock USDC in escrow |
| `submit(job_id, deliverable)` | provider | Submit work result URI |
| `complete(job_id)` | evaluator | Release 99% to provider, 1% to treasury |
| `cancel(job_id)` | client | Refund full budget (only from Funded) |
| `fee_bps()` | — | Current fee in basis points |
| `set_fee_bps(bps)` | admin | Update fee (max 5%) |
| `set_treasury(addr)` | admin | Update treasury address |

---

## Testing

```bash
# Run all Soroban contract tests (19 total: 7 identity + 12 commerce)
cargo test

# Verify SDK compiles
cd sdk && npx tsc --noEmit
```

## Tech Stack

- **Smart Contracts:** Rust + Soroban SDK 25.3.1 → WASM (wasm32v1-none)
- **TypeScript SDK:** @stellar/stellar-sdk 14.6.1 + x402-stellar 0.2.0
- **Dashboard:** Express + vanilla JS SPA
- **Deployment:** stellar CLI 25.2.0
- **Standards:** ERC-8004 (Agent Identity), ERC-8183 (Agentic Commerce), x402 (Micropayments), MPP (Machine-Payable Pages)

---

## Team

Built by [@mmhhmm](https://github.com/mmhhmm)

## License

MIT
