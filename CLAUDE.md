# CLAUDE.md — marc-stellar project memory

This file is auto-loaded into Claude Code's context every session for this project. Treat it as ground truth. Update it after every task so future sessions don't re-learn the same lessons.

## Project in one sentence

MARC on Stellar — a commerce layer for agent payments (job escrow + agent identity) built on Soroban, sitting on top of the existing Stellar x402/MPP payment rails. Hackathon submission for Stellar Hacks: Agents (x402 × Stripe MPP). 48-hour deadline starting 2026-04-11.

## Source of truth documents (read in this order before any work)

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
| `@stellar/stellar-sdk` | `^13.0.0` | Confirmed at plan-writing time. Adjust if `npm install` warns. |
| `x402-stellar` | latest | Track whatever `npm install x402-stellar` resolves; pin after first successful build. |
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
| 2026-04-11 | Scaffolding: hackathon skill, design spec, design system, impl plan, CLAUDE.md | ✅ | All 5 committed. Ready to begin Phase 0 Task 0.1. |

## Gotchas learned (append after each surprise)

- `wasm32-unknown-unknown` target is deprecated by stellar-cli 25.x — use `wasm32v1-none`.
- `stellar contract deploy` auto-uploads, installs, and deploys in one step (vs. older 3-step flow).
- `cargo search` can be stale — prefer `cargo info <crate>` or the crates.io JSON API for live version data.
- soroban-sdk 26.0.0 was published 2026-04-09 (2 days before this hackathon). Unverified against CLI 25.2.0. Stick with 25.3.1.
- In Soroban 22+, the testutils `env.register(Contract, ())` returns a contract ID directly — no separate `register_contract` helper needed.

## Open risks / things to verify during implementation

- `register_stellar_asset_contract_v2` API signature may have changed in 25.x — verify in the first test that uses it
- `token::Client::new(&env, &token_addr)` path may need to be `soroban_sdk::token::Client` — check during Task 2.2
- `x402-stellar`'s `paymentMiddleware` signature is not yet read — read its README before Task 4.4
- `stellar-sdk` 13.x renamed `SorobanRpc` to `rpc` — SDK code assumes `rpc.Server`; verify at first build

## Emergency contacts (if totally stuck)

- Stellar Dev Skill: https://github.com/stellar/stellar-dev-skill
- Soroban docs: https://developers.stellar.org/docs/build
- stellar-cli issue tracker: https://github.com/stellar/stellar-cli/issues
- Hackathon FAQ: https://github.com/briwylde08/stellar-hackathon-faq
