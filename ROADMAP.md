# MARC on Stellar — Roadmap

Single-page status tracker. **If you're a Claude agent picking up this project, read this file first** — then `CLAUDE.md` for rules/gotchas, then `docs/plans/2026-04-11-marc-stellar.md` for the full step-by-step.

**Goal:** Ship MARC (commerce layer for agent payments) on Stellar testnet in 48h. Two Soroban contracts + TS SDK + CLI demo + landing page.
**Deadline:** 2026-04-11 + 48h.
**Hackathon:** Stellar Hacks: Agents (x402 × Stripe MPP).

---

## Current state

**Phase:** 2 (Agentic Commerce contract)
**Last completed:** Phase 1 — `agent_identity` contract fully green (7 tests, 4.2 KB optimized WASM)
**Next action:** Phase 2 Task 2.1 — scaffold `contracts/agentic-commerce` crate with `init` + smoke test

---

## Phase tracker

| # | Phase | Status | Tasks | Notes |
|---|---|---|---|---|
| 0 | Workspace scaffolding | ✅ done | 3/3 | Rust workspace + SDK + demo + landing + scripts |
| 1 | `agent_identity` contract | ✅ done | 5/5 | 7 tests green, 4.2 KB WASM, 6 entry points |
| **2** | **`agentic_commerce` contract** | 🚧 **in progress** | **0/7** | **Escrow + 99/1 fee split. The hard one.** |
| 3 | Testnet deployment | ⬜ todo | 0/2 | `stellar keys generate` + deploy script |
| 4 | TypeScript SDK | ⬜ todo | 0/6 | types, IdentityClient, CommerceClient, marcPaywall, marcFetch, index |
| 5 | CLI demo | ⬜ todo | 0/4 | seller-agent, buyer-agent, lifecycle orchestrator, dry run |
| 6 | Landing page | ⬜ todo | 0/4 | HTML + CSS + JS + Vercel deploy |
| 7 | Submission materials | ⬜ todo | 0/6 | README, LIGHTPAPER, PROTOCOL, pitch video, DoraHacks form, git tag |

---

## Phase 2 task breakdown (what we're doing right now)

| # | Task | State | Green criteria |
|---|---|---|---|
| 2.1 | Scaffold `agentic-commerce` crate + `init` + smoke test | ⬜ | 1 test pass: admin/treasury/fee set after init |
| 2.2 | `create_job` with token escrow pull | ⬜ | Budget moves from buyer → contract; job status = Funded |
| 2.3 | `submit` (provider-only guard) | ⬜ | 2 tests: happy + non-provider panic |
| 2.4 | `complete` with 99/1 fee split | ⬜ | Seller gets 99%, treasury gets 1%, contract balance = 0 |
| 2.5 | `cancel` refund path | ⬜ | Full budget back to buyer, status = Cancelled |
| 2.6 | `set_treasury` + `set_fee_bps` (admin, 5% cap) | ⬜ | 2 tests: admin update + 501 bps panic |
| 2.7 | Build release WASM + optimize | ⬜ | Under 50 KB, ABI shows all 8+ entry points |

**Target:** 8+ tests green, one WASM file under 50 KB, zero clippy warnings.

---

## Downstream dependencies (what each phase unlocks)

```
Phase 0 (scaffold)
  └─> Phase 1 (agent_identity) ✅
       └─> Phase 2 (agentic_commerce) 🚧
            ├─> Phase 3 (deploy both contracts)
            │    └─> Phase 4 (SDK wrappers — needs deployed addresses)
            │         └─> Phase 5 (CLI demo — needs SDK + deployed addresses)
            │              └─> Phase 7.4 (pitch video — films the demo)
            └─> Phase 6 (landing page — independent, can run parallel)
                 └─> Phase 7.1-.3 (README + lightpaper — references everything)
                      └─> Phase 7.5-.6 (DoraHacks submit + git tag)
```

**Critical path:** 2 → 3 → 4 → 5 → 7.4. If any of these breaks, we have no demo to ship.

---

## Cut list (if we fall behind, in order)

1. Dark mode toggle (never started)
2. Orange particle background animation
3. How-it-works section on landing
4. `docs/PROTOCOL.md` (reference only — lightpaper is enough)
5. `cancel` entry point + its test (only if literally cannot compile)
6. Landing page entirely — ship just README + video

**Never cut:** both contracts, the CLI demo, the pitch video, the README.

---

## Where to find things

- **Operating rules + gotchas:** `CLAUDE.md` (auto-loaded into Claude context every session)
- **Full step-by-step plan:** `docs/plans/2026-04-11-marc-stellar.md`
- **Locked scope + contract designs:** `docs/superpowers/specs/2026-04-11-marc-stellar-design.md`
- **Visual design tokens + landing specs:** `docs/design-system.md`
- **Hackathon resources (x402, MPP, Soroban):** `.claude/skills/stellar-hackathon/SKILL.md`
- **Original MARC Solidity (shape reference only, don't copy):** `/Users/ram/Desktop/marc/contracts/`

---

## Update protocol

After every task completes:
1. Check the box in the "Phase task breakdown" table above
2. Bump "Last completed" and "Next action" at the top
3. When a whole phase finishes, flip its row to ✅ and move to the next phase row
4. Commit the ROADMAP.md change alongside the task's feature commit (or as a separate `docs: roadmap` commit)
