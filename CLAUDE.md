# CLAUDE.md — marc-stellar project memory

This file is auto-loaded into Claude Code's context every session for this project. Treat it as ground truth. Update it after every task so future sessions don't re-learn the same lessons.

## Project in one sentence

MARC on Stellar — a commerce layer for agent payments (job escrow + agent identity) built on Soroban, sitting on top of the existing Stellar x402/MPP payment rails. Hackathon submission for Stellar Hacks: Agents (x402 × Stripe MPP). 48-hour deadline starting 2026-04-11.

## Source of truth documents (read in this order before any work)

0. **`ROADMAP.md`** — ⭐ single-page "where are we, what's next" status tracker. Always read first.
1. `docs/superpowers/specs/2026-04-11-marc-stellar-design.md` — **LOCKED** scope, contract designs, architecture
2. `docs/plans/2026-04-11-marc-stellar.md` — bite-sized TDD implementation plan
3. `docs/design-system.md` — visual tokens + landing page component specs
4. `.claude/skills/stellar-hackathon/SKILL.md` — curated hackathon resources (x402, MPP, Soroban, tools)

If anything in this file contradicts those docs, those docs win.

## Operating rules (this session)

1. **Quality over speed.** We are NOT rushing. Each task gets full TDD, self-audit, and commit. If a shortcut would save 10 minutes but skip a test, we take the 10 minutes.
2. **TDD for every contract entry point.** Failing test → run it to see it fail → implement → run it to see it pass → commit. No exceptions.
3. **Self-audit after every task.** Before committing, re-read the diff, re-read relevant CLAUDE.md sections, re-read the task definition in the plan, verify nothing was hallucinated or skipped.
4. **Audit previous sections before starting new ones.** Phase N+1 begins with a 60-second review of the "What's done" section of this file to catch drift.
5. **Update this file after every task.** Record what changed, what gotchas were hit, what decisions were made.
6. **No scope creep.** If a task surfaces work not in the plan, STOP and flag it — do not silently add it.
7. **Commit after every green test.** Linear history via normal commits. No rebases, no force pushes, no amends.

## Toolchain (verified 2026-04-11)

- Rust 1.92.0 (stable)
- Cargo 1.92.0
- stellar CLI 25.2.0 (Homebrew)
- Node.js 25.2.1, npm 11.7.0
- Rust target: `wasm32v1-none` (installed; `wasm32-unknown-unknown` is deprecated for Soroban 25+)

## Locked dependency versions (DO NOT bump without re-testing)

| Dependency | Version | Why |
|---|---|---|
| `soroban-sdk` | `25.3.1` | Matches stellar-cli 25.x major. SDK 26.0.0 is 2 days old and unverified against our CLI. |
| `@stellar/stellar-sdk` | `^12.3.0` | **Forced to 12.x by x402-stellar@0.2.0 peer requirement.** Latest is 15.0.1. Do NOT upgrade until x402-stellar supports 13+. |
| `x402-stellar` | `^0.2.0` | Latest on npm. Peer-deps `@stellar/stellar-sdk@^12.0.0`. Only 2 published versions (0.1.0, 0.2.0). |
| `express` | `^4.19.0` | Peer of `x402-stellar` paywall. |
| `typescript` | `^5.6.0` | |

**If a version needs changing, update this table AND the plan AND the affected Cargo.toml/package.json.**

## Project conventions

- Contract crate names: `agent-identity`, `agentic-commerce` (kebab in Cargo.toml, snake in WASM filenames)
- Contract struct name: `AgentIdentityContract`, `AgenticCommerceContract`
- All state-changing entry points MUST call `caller.require_auth()` on the authorizing address
- Use `env.storage().persistent()` for job/agent state, `env.storage().instance()` for singletons (admin, treasury, next_id, fee_bps)
- Events: topic is `(Symbol::new(&env, "name"), actor_address)`, data is a tuple
- Tests: `env.mock_all_auths()` in every test; use `Address::generate(&env)` for fresh addresses
- SDK file layout: one class per contract (`IdentityClient`, `CommerceClient`), shared `types.ts`, `marcPaywall.ts` + `marcFetch.ts` wrap `x402-stellar`
- Commit messages: conventional commits (`feat:`, `test:`, `chore:`, `docs:`, `fix:`)

## Self-audit checklist (run before committing any task)

1. [ ] Does the diff only touch files listed in the current task's `Files:` section?
2. [ ] Did I write the test FIRST and see it fail?
3. [ ] Did I run the test after implementing and see it pass?
4. [ ] Are there any `panic!()` messages in the code that don't have matching `should_panic(expected = ...)` tests?
5. [ ] Are there any imports that are not used?
6. [ ] Did I cross-check the Soroban API against `~/.cargo/registry/src/.../soroban-sdk-25.3.1/src/` if the code is doing something I haven't done before?
7. [ ] Is the commit message conventional and accurate?
8. [ ] Did I update CLAUDE.md's "What's done" section with this task's outcome?

## What's done

| Date | Task | Outcome | Notes |
|---|---|---|---|
| 2026-04-11 | Scaffolding: hackathon skill, design spec, design system, impl plan, CLAUDE.md | ✅ | All 5 committed. |
| 2026-04-11 | Phase 0.1: Cargo workspace root | ✅ | `Cargo.toml` + `rust-toolchain.toml` + `.gitignore` + `deployments/.gitkeep`. Workspace parses (`cargo metadata` clean). **Plan drift:** members list is empty for now — each phase adds its own crate to the list when scaffolding it. Plan section 0.1 step 1 shows members populated upfront, but that fails `cargo metadata` because the crates don't exist yet. Fixed in-place and documented. |
| 2026-04-11 | Phase 0.2: SDK package scaffold | ✅ | `sdk/package.json` + `tsconfig.json` + `src/index.ts` stub + `README.md`. `npm install` clean (125 pkgs, 0 vulns). `npx tsc --noEmit` clean. **Plan drift:** `@stellar/stellar-sdk` pinned to `^12.3.0` (not ^13) because `x402-stellar@0.2.0` requires peer `^12.0.0`. Latest stellar-sdk is 15.0.1 but we can't use it. Phase 4 SDK code must target stellar-sdk 12.x API (`SorobanRpc.Server`, not `rpc.Server`). |
| 2026-04-11 | Phase 0.3: Demo + landing + scripts | ✅ | `demo/package.json` (with `marc-stellar-sdk` as file: dep) + `tsconfig.json` + `.env.example`, `landing/.gitkeep`, `scripts/build.sh` + `scripts/deploy-testnet.sh` (skeleton, exit 1). Both scripts chmod +x. Demo also pinned to stellar-sdk ^12.3.0. npm install deferred until Phase 5 so we're not carrying duplicate node_modules. |
| 2026-04-11 | Phase 1.1: agent-identity scaffold + smoke test | ✅ | `contracts/agent-identity/{Cargo.toml,src/lib.rs,src/test.rs}`, added to workspace members. Smoke test uses `env.register(Contract, ())` (25.x API). Needed a `version()` stub so the `#[contractimpl]` isn't empty. |
| 2026-04-11 | Phase 1.2: register + get_agent + agent_of | ✅ | TDD: failing test → impl → 2 passing. **Idiom gotcha caught:** `env.events().publish` is deprecated in 25.x; migrated to `#[contractevent]` struct macro with `#[topic]` field attribute. Events are now type-safe and included in the contract's ABI spec. |
| 2026-04-11 | Phase 1.3: update_uri (owner-only) | ✅ | 2 new tests (happy + `#[should_panic(expected = "not agent owner")]`). `UriUpdated` event. 4 total tests green. |
| 2026-04-11 | Phase 1.4: deregister | ✅ | 3 new tests: cleanup, non-owner reject, re-register-after-deregister (ids are sequential, never reused). `Deregistered` event. 7 total tests green. |
| 2026-04-11 | Phase 1.5: build release WASM + optimize | ✅ | `cargo build --target wasm32v1-none --release` → 4900 B. `stellar contract build --optimize` → 4242 B with 6 exported functions: `agent_of`, `deregister`, `get_agent`, `register`, `update_uri`, `version`. **Gotcha:** `stellar contract optimize` is deprecated; must use `build --optimize`. Updated `scripts/build.sh`. |
| 2026-04-11 | Phase 2.1: agentic-commerce scaffold + init | ✅ | `contracts/agentic-commerce/{Cargo.toml,src/lib.rs,src/test.rs}` added to workspace. `init(admin, treasury)` sets admin/treasury/FeeBps=100/NextId=1, panics on double-init. 2 tests green. |
| 2026-04-11 | Phase 2.2: create_job with token escrow | ✅ | TDD. Used `env.register_stellar_asset_contract_v2(admin)` + `StellarAssetClient::mint` + `TokenClient::transfer` from `soroban_sdk::token`. Plan used deprecated alias `token::Client`; switched to `token::TokenClient`. Plan used deprecated `env.events().publish`; migrated to `#[contractevent] JobCreated`. 3 tests green. |
| 2026-04-11 | Phase 2.3: submit (provider-only) | ✅ | 2 new tests (happy + `#[should_panic(expected = "not provider")]`). `JobSubmitted` event. 5 total. |
| 2026-04-11 | Phase 2.4: complete with 99/1 fee split | ✅ | Math: `fee = budget * fee_bps / 10_000`, `payout = budget - fee`. 2 new tests verify 99k/1k/0 balances + non-evaluator reject. `JobCompleted` event carries payout + fee. 7 total. |
| 2026-04-11 | Phase 2.5: cancel refund path | ✅ | Only allowed while `Funded`. Returns full budget to client. 2 new tests (happy + non-client reject). `JobCancelled` event. 9 total. |
| 2026-04-11 | Phase 2.6: admin setters + 5% cap | ✅ | `set_treasury`, `set_fee_bps`, `fee_bps` getter. Hard cap `MAX_FEE_BPS=500`. 3 new tests: admin happy-path, 501 bps panic, non-admin reject. 12 total. |
| 2026-04-11 | Phase 2.7: build release WASM + optimize | ✅ | `stellar contract build --optimize` → `agentic_commerce.wasm` 9387 B (vs 50 KB budget = 19%), 10 exported functions: `cancel`, `complete`, `create_job`, `fee_bps`, `get_job`, `init`, `set_fee_bps`, `set_treasury`, `submit`, `version`. Both contracts built clean. |
| 2026-04-11 | Phase 2 polish: clippy clean | ✅ | Clippy flagged `needless_borrows_for_generic_args` on `&env.current_contract_address()` in 4 callsites (token transfers). Fixed by hoisting to a local `let contract_addr = env.current_contract_address();` and borrowing that. Workspace clippy `-D warnings` green. 12/12 tests still green after refactor. |
| 2026-04-11 | Phase 3.0: deploy script rewrite | ✅ | Plan's script was written against deprecated `stellar contract optimize` + `.optimized.wasm` naming. Rewrote to use `stellar contract build --optimize` (in-place) + `--source-account` flag. `bash -n` clean. |
| 2026-04-11 | Phase 3.1: deployer identity + friendbot fund | ✅ | `stellar keys generate deployer --network testnet --fund` saved key to `~/.config/stellar/identity/deployer.toml`. Address: `GA5VIZYCUM3IUZZNQTTB7YSLJSE5WZ2EI5EGWNLTWQ234SLSH45MPKX3`. |
| 2026-04-11 | Phase 3.2: testnet deploy + init | ✅ | `./scripts/deploy-testnet.sh` uploaded 2 WASMs, deployed 2 contracts, invoked `init`. Addresses: `agent_identity = CAMPXYFZJTIPEVOPOAZPRG5OHXKNBDPGTPRCOIO4LVPGEM4TONPY65A5`, `agentic_commerce = CD2KWU7IE74Z2QKVP3FQ67J46XHNMGIDTNKXVWE7ZNVRC7T6UH46GQXE`. Written to `deployments/testnet.json` (gitignored). |
| 2026-04-11 | Phase 3 sanity: live invoke | ✅ | `fee_bps()` on commerce returns `100` (1%) proving init ran. `version()` returns `1` on both contracts. Read-only invokes only simulate; 25.x CLI prints `Simulation identified as read-only. Send by rerunning with --send=yes` before the result — the result is still printed. |
| 2026-04-11 | Phase 4.1: sdk/src/types.ts | ✅ | `Address`, `Agent`, `Job`, `JobStatus`, `MarcConfig` mirroring on-chain structs. `bigint` for `u64`/`i128`. Added `TESTNET` preset with deployed addresses (CAMPXYFZ... / CD2KWU7I...) pulled from `deployments/testnet.json`. `npx tsc` clean; emits `dist/types.{js,d.ts}`. |

## Gotchas learned (append after each surprise)

- `wasm32-unknown-unknown` target is deprecated by stellar-cli 25.x — use `wasm32v1-none`.
- `stellar contract deploy` auto-uploads, installs, and deploys in one step (vs. older 3-step flow).
- `cargo search` can be stale — prefer `cargo info <crate>` or the crates.io JSON API for live version data.
- soroban-sdk 26.0.0 was published 2026-04-09 (2 days before this hackathon). Unverified against CLI 25.2.0. Stick with 25.3.1.
- In Soroban 22+, the testutils `env.register(Contract, ())` returns a contract ID directly — no separate `register_contract` helper needed.
- Cargo workspace `members = [...]` list must reference existing crates — can't list them upfront. Use empty list and add each member when scaffolding its crate.
- `soroban-sdk` 25.x **deprecates `env.events().publish()`** — use `#[contractevent]` struct with `#[topic]` field attrs and call `.publish(&env)` on an instance. Events are then type-safe and show up in the contract ABI spec. Plan was written for the old API; migrated in Phase 1.2.
- `soroban-sdk` 25.x **auto-generates `contracts/<crate>/test_snapshots/test/<test_name>.<n>.json`** when tests run. These are committed so test output is reproducible across runs and CI.
- `stellar contract optimize --wasm <path>` is **deprecated** in stellar-cli 25.x. Use `stellar contract build --optimize` instead — it builds, optimizes, hashes, and lists exported functions in one pass. `scripts/build.sh` uses the new command.
- An empty `#[contractimpl]` block (no entry points) is allowed to compile but gives you a client type that can't be used. Always keep at least a `version() -> u32` stub in the initial scaffold.
- Inside `#[contractimpl]` methods, the `env` argument is a normal owned `Env` (not `&Env`), and Rust's `Address` ownership rules mean you need `owner.clone()` at every callsite that reuses the same address after `require_auth()` or storage ops.
- `soroban_sdk::token::Client` is a **deprecated alias** — use `soroban_sdk::token::TokenClient` (read-only) and `soroban_sdk::token::StellarAssetClient` (admin/mint-capable) directly.
- `env.register_stellar_asset_contract_v2(admin: Address) -> StellarAssetContract` (25.x testutils) is the supported way to deploy a SAC in tests. Call `.address()` on the return value. The old `register_stellar_asset_contract` (v1) is gone.
- Clippy `-D warnings` flags `&env.current_contract_address()` as `needless_borrows_for_generic_args` because the generated token client methods take generic `IntoVal` args. Hoist to `let contract_addr = env.current_contract_address();` and borrow that instead of inlining.
- stellar-cli 25.x: `stellar contract build --optimize` writes the wasm **in place** (same filename, NO `.optimized.wasm` suffix). Plans/scripts inherited from older versions that expect a separate `.optimized.wasm` file must be rewritten.
- `stellar contract invoke` uses `--source-account` (not `--source`) as the canonical flag in 25.x. `--source` is still an alias but `--source-account` is what `--help` shows.
- Multi-line shell commands with `\` line continuations pasted into a single-line bash wrapper sometimes introduce an empty `''` arg that stellar-cli rejects as "unexpected argument ''". Inline the command on one line when shelling it out from tool calls.
- Read-only contract calls in 25.x print `Simulation identified as read-only. Send by rerunning with --send=yes` to stderr, then the result to stdout. The result IS returned — ignore the suggestion unless you actually need to write to ledger.

## Open risks / things to verify during implementation

- `register_stellar_asset_contract_v2` API signature may have changed in 25.x — verify in the first test that uses it
- `token::Client::new(&env, &token_addr)` path may need to be `soroban_sdk::token::Client` — check during Task 2.2
- `x402-stellar`'s `paymentMiddleware` signature is not yet read — read its README before Task 4.4
- `stellar-sdk` 13.x renamed `SorobanRpc` to `rpc` — SDK code assumes `rpc.Server`; verify at first build. **WE ARE ON 12.x** per x402-stellar peer requirement — the 12.x API uses `SorobanRpc.Server`, not `rpc.Server`. Plan code in Phase 4 will need to be adjusted.

## Emergency contacts (if totally stuck)

- Stellar Dev Skill: https://github.com/stellar/stellar-dev-skill
- Soroban docs: https://developers.stellar.org/docs/build
- stellar-cli issue tracker: https://github.com/stellar/stellar-cli/issues
- Hackathon FAQ: https://github.com/briwylde08/stellar-hackathon-faq
