# June 2026 Quality Sprint

A focused 20-day sprint (Jun 1 – Jun 22) to land the docs, tests,
refactor, UX, and repo-hygiene improvements that have been quietly
piling up since launch. The goal is to leave the codebase in a
materially better shape across every surface — contracts, SDK,
backend, frontend, scripts — before the next product milestone.

Sister docs: [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the system
map, [`REPO_GOVERNANCE.md`](./REPO_GOVERNANCE.md) for the merge
process, [`MINIPAY_INTEGRATION.md`](./MINIPAY_INTEGRATION.md) for
the wallet-specific slice.

## Goals

By end of Jun 22 we want:

1. **NatSpec coverage** on every public + external function across
   every contract interface — `IPredictionPool`, `IResolutionModule`,
   `ICircleFactory`, `IMembershipNFT`, `IPredictionPoolGovernance`.
2. **JSDoc coverage** on every exported helper in `circlo-sdk` and
   every public type in `circlo-types`.
3. **Unit-test growth**: SDK from 30 → 60+ tests, frontend hook tests
   added for the wallet + chain hooks.
4. **Refactor pass**: magic numbers extracted, repeated URL builders
   consolidated, type tightening across frontend wallet/chain code.
5. **UX polish**: empty states, error wording, loading skeletons,
   tooltips, ARIA — every page hit during the MiniPay flow gets one
   improvement.
6. **Repo quality**: husky pre-commit hooks, issue templates, stricter
   biome rules, dependabot grouping review.

## Daily rhythm

Target: **~10 small, focused commits per day.** Each commit ships a
single concept; small enough to read in 60 seconds.

| Window | Commits | Topic | Vibe |
|---|---|---|---|
| Pagi (08–10 WIB) | 3–4 | Docs / JSDoc / NatSpec | Coffee mode |
| Siang (12–15 WIB) | 2–3 | Tests / dep bumps | Lunch break |
| Malam (19–22 WIB) | 3–4 | Refactor / UX polish / repo | Wind-down |

Push cadence: **batch of 2–3 commits per push.** Keeps the activity
graph rhythmic and the PR list readable; avoids both single-commit
push spam and end-of-day mega-pushes.

## Weekly themes

| Week | Dates | Theme | Headline output |
|---|---|---|---|
| **W1** | Jun 1–5 | Docs sprint | NatSpec on remaining interfaces, JSDoc on SDK reads/writes, sister integration docs |
| **W2** | Jun 8–12 | Tests sprint | SDK unit-test growth, frontend hook tests, contract edge-case fuzz |
| **W3** | Jun 15–19 | Refactor sprint | Magic-number constants, helper extraction, type tightening |
| **W4** | Jun 22 | Final polish | UX wording, repo-hygiene closeout, CHANGELOG sweep |

Weekends are not blocked off — if the writer is on, ship. Theme is a
default, not a rule; if a UX bug surfaces in W2 it gets fixed in W2.

## Topic backlog

### A. Docs / NatSpec / JSDoc (~70 commits)

- One commit per public function NatSpec added to each interface
  (`IPredictionPool`, `IResolutionModule`, `ICircleFactory`,
  `IMembershipNFT`, `IPredictionPoolGovernance`)
- One commit per JSDoc block added to a `circlo-sdk` helper —
  `getOdds`, `getPayout`, `getCircleMember`, `getStakeOf`,
  `getPoolPerSide`, `claim`, `refund`, `submitVote`, etc.
- One commit per type/enum/struct JSDoc in `circlo-types`
- Per-package READMEs: expand `packages/circlo-sdk/README.md`,
  create `packages/circlo-types/README.md`
- Sister integration guides: `docs/BACKEND_INTEGRATION.md`,
  `docs/FRONTEND_INTEGRATION.md`, `docs/INDEXER_INTEGRATION.md`
- ARCHITECTURE.md expansions: ASCII data-flow diagrams,
  per-user-flow sequence sketches
- CHANGELOG entries that were skipped on earlier commits

### B. Tests (~40 commits)

- One test case per commit for the still-untested SDK helpers
- `useMiniPay`, `useCircleMember`, `useExplorerUrl` hook tests
  (Vitest + jsdom)
- Contract fuzz: edge cases for `submitVote`, `claim`, `refund`,
  reentrancy guards
- Indexer reorg-handling test
- SIWE end-to-end mock test
- One test that fails today and gets fixed in the same commit
  (legit bugfix-with-test pattern)

### C. Refactor (~35 commits)

- Magic numbers → named constants per file
  (`MIN_STAKE`, `DEFAULT_DEADLINE`, gas budgets, etc.)
- Repeated explorer URL builders → consolidate behind
  `frontend/src/lib/web3/network.ts` helpers
- Type tightening: replace remaining `any` with proper types
- Extract small helpers from inline copy-pasted logic
- Rename ambiguous variables/functions (`data`, `result`, `temp`)
- Pull repeated wagmi config into a single hook

### D. Frontend UX polish (~40 commits)

- Empty-state copy per page (no goals, no circles, no members,
  no activity)
- Error toast wording — replace generic "Something went wrong"
  with actionable messages
- Loading skeletons on every data-fetching component
- Network badge variants (mainnet vs sepolia colors)
- Tooltips on technical labels (`Settlement heartbeat`, `On-chain ID`)
- Keyboard shortcuts: `/` to focus search, `Esc` to close sheets
- ARIA labels for screen-reader support
- Mobile breakpoint fixes per page
- Avatar fallback polish
- Connect-wallet sheet copy improvements

### E. Repo / CI (~25 commits)

- Prettier config alongside biome (for non-JS files)
- Husky pre-commit hooks
- Github Actions caching improvements
- `.nvmrc` for Node version pinning
- `.vscode/extensions.json` recommendations
- Issue templates in `.github/ISSUE_TEMPLATE/`
- Stricter biome rules per package
- Dependabot grouping review (consolidate noisy groups)
- CI matrix expansion: add Node 22.x alongside 20.x
- Workflow concurrency cancels on new push

## Anti-patterns to avoid

- ❌ Empty / whitespace-only commits — caught by repo hygiene and adds nothing
- ❌ "wip", "asdf", "fix", "update" as commit messages
- ❌ Force-amend pattern of 10 small edits on the same file
- ❌ Same-hour burst of 10+ commits — push graph spike looks unnatural
- ❌ Doc commits that just reflow whitespace
- ❌ Test commits with no actual assertion (placeholder `expect(true)`)

## Practical commit rule

Each commit must:

1. Touch **≥ 3 lines** of real change (no whitespace-only diffs)
2. Use the conventional message format:
   `<type>(<scope>): <verb> <what> [+ <why>]`
   e.g. `docs(sdk): JSDoc claim() with revert table + payout formula`
3. Vary the scope across the day — don't ship 10 `docs(sdk)` in a row
4. Be self-contained — no commit relies on the next one to compile

## Tracking

Progress against the 200-commit target is tracked in `git log` —
no separate burndown file. Quick check:

```bash
git log --since="2026-06-01" --until="2026-06-23" --oneline | wc -l
```

Categories tracked by commit-message `type:`:

```bash
git log --since="2026-06-01" --oneline | grep -E "^[a-f0-9]+ (docs|test|refactor|feat|fix|chore|style)" | \
  sed -E 's/^[a-f0-9]+ ([a-z]+).*/\1/' | sort | uniq -c
```

The goal is not the count itself but the codebase quality the count
represents. If we hit 200 commits and the repo isn't visibly better,
we did it wrong.
