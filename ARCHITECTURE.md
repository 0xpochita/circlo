# Circlo — Architecture

This doc captures the moving pieces of Circlo end-to-end: the
on-chain contracts on Celo Mainnet, the off-chain backend + indexer,
the Next.js frontend, and the npm packages that glue them together.

For day-to-day operational context (deployment addresses, demo URL,
business model), see [`README.md`](./README.md). For the responsible
disclosure policy, see [`SECURITY.md`](./SECURITY.md).

## Component map

```
                  ┌──────────────────────────────────────┐
                  │  Celo Mainnet (chainId 42220)        │
                  │                                      │
                  │   CircleFactory  PredictionPool      │
                  │        │             │               │
                  │        │             ▼               │
                  │        │       ResolutionModule      │
                  │        │             │               │
                  │        └─────────────┘               │
                  │              ▲                       │
                  │              │ UUPS upgrades         │
                  │              │ (48h delay)           │
                  │      TimelockController              │
                  └──────────────│──────────────────────┘
                                 │ event logs
                                 ▼
   ┌──────────────────────────────────────────────────┐
   │  Backend (Fastify, Railway)                      │
   │  ┌──────────┐  ┌──────────┐  ┌─────────────┐    │
   │  │  REST    │  │  WS gw   │  │  Indexer    │    │
   │  │  /api    │  │ Redis ps │  │  viem HTTP  │    │
   │  └────┬─────┘  └────┬─────┘  └──────┬──────┘    │
   │       └────────────┬┴────────────────┘          │
   │                    ▼                            │
   │             PostgreSQL + Redis                  │
   └──────────────────────┬──────────────────────────┘
                          │ HTTPS + WebSocket
                          ▼
   ┌──────────────────────────────────────────────────┐
   │  Frontend (Next.js, Vercel)                      │
   │   - SIWE login + JWT cookie                      │
   │   - wagmi + viem write calls                     │
   │   - circlo-sdk (npm) for typed contract helpers  │
   │   - SettlementBadge / NetworkBadge / OnChainBadge │
   └──────────────────────────────────────────────────┘
```

## On-chain contracts (`sc/src/`)

All four contracts use the ERC1967 UUPS proxy pattern. `_authorizeUpgrade`
is gated by `UPGRADER_ROLE`, currently held by `TimelockController`
(48h delay) and the deployer EOA. Admin roles (`DEFAULT_ADMIN_ROLE`,
`PAUSER_ROLE`, `FEE_SETTER_ROLE`) are also delegated to the deployer
for day-to-day operations after the initial 48h timelock dance.

| Contract | Responsibility |
|---|---|
| `CircleFactory` | Membership registry. Public + private circles, owner-only add/remove, off-chain EIP-712 invite proofs for private circles. |
| `PredictionPool` | Goal lifecycle, escrow, claims. Holds USDT on Celo until resolution. Now also exposes a permissionless `settlement()` heartbeat. |
| `ResolutionModule` | Resolver voting layer. Quorum + tally → calls `setWinner` or `markDisputed` on PredictionPool. |
| `RewardDistributor` | Optional referral + retention bonus pool. Independent of the goal lifecycle. |

Goal status enum (`PredictionPool.GoalStatus`):

```
Open ──(deadline)──► Locked ──(startVote)──► Resolving
                                              │
                                       ┌──────┴──────┐
                                       │             │
                                       ▼             ▼
                                    PaidOut      Disputed
```

The Settlement event added in 0.3.0 is intentionally orthogonal to
this lifecycle — it does not transition status and does not touch
escrow. It's purely a permissionless on-chain ping for liveness
indicators.

## Off-chain backend (`backend/src/`)

A single Fastify process runs three concerns:

1. **REST API** — 28 endpoints under `/api/*`, SIWE auth, JWT
   in httpOnly cookie. See `backend/docs/API.md` for the full surface.
2. **Indexer** — viem HTTP polling on Celo Mainnet RPC. Backfills
   from the last persisted block on cold start, then watches new logs.
   Handlers are idempotent (deterministic notification IDs, on-chain
   `stakeOf` reads on replay) so dropped + re-delivered logs are safe.
3. **WebSocket gateway** — push channel for real-time UI. Pub/sub
   over Redis so multiple gateway instances stay coherent.

BullMQ runs two recurring jobs alongside:

- `lockExpiredGoals` — cron every 1 min. Picks up Goals past deadline
  and calls `lockGoal` on Celo Mainnet from a service wallet.
- `detectDisputes` — cron every 5 min. Polls Resolving goals whose
  vote window expired and triggers `finalize`.

## Frontend (`frontend/src/`)

Next.js App Router, with the auth-gated app under `(main)` and
the SIWE flow under `(onboarding)`.

Wallet layer:

- **wagmi v2 + viem** for writes (`useWriteContract`, `useAccount`).
- **circlo-sdk** for typed contract calls. The hooks under
  `src/hooks/` build the wagmi client and delegate to `circlo-sdk`
  for the actual ABI + address binding.
- **Web3Provider** at the app root configures the Celo chain +
  injected/MiniPay connectors.

Surface helpers in `@/components/shared/`:

- `AddressLink` — shortened address with anchor to active Celo
  block explorer (Celoscan / Blockscout).
- `OnChainBadge` — "On-chain" pill for goals/addresses/tx hashes.
- `NetworkBadge` — top-right Celo Mainnet/Sepolia indicator.
- `SettlementBadge` — bottom-left heartbeat pill driven by the
  `Settlement(timestamp)` event.

### MiniPay integration

Circlo is built as a MiniPay-first Mini App. The relevant pieces:

- **Detection** — `lib/web3/minipay.ts#isMiniPay()` checks
  `window.ethereum.isMiniPay` first, falling back to a `?minipay=1`
  query-string override useful for desktop QA.
- **Implicit auto-connect** — `Header.tsx` and `ProfileHero.tsx`
  fire `connectAsync` in a mount effect whenever
  `isMiniPayBrowser && !isConnected && !isAuthenticated`, so the
  user is never asked to tap a Connect button (per Mini App
  listing guidelines). A second `isAuthenticated` branch silently
  re-attaches wagmi after a navigation without re-triggering SIWE.
- **UI gating** — buttons that depend on the wallet read
  `isConnected || isAuthenticated` rather than `isConnected` alone,
  since wagmi state briefly reads disconnected on every in-app
  navigation while the session is still valid.
- **On-chain membership truth** — circle-details and JoinButton
  both call `CircleFactory.isCircleMember(circleId, address)` so
  members land on the Create Goal CTA even when the backend
  `membersPreview` hasn't synced yet.
- **Legacy txs only** — every write call uses `type: "legacy"`.
  MiniPay does not honour EIP-1559 fee fields.
- **PWA shell** — `/manifest.json` + 192/512/180 icons + ToS at
  `/terms` + Privacy at `/privacy` are all served from the Next.js
  app, satisfying the developer.minipay.to listing form.

## npm packages (`packages/`)

Two packages are published from this monorepo:

| Package | Surface |
|---|---|
| `circlo-types` | Typed ABIs (`as const`), contract addresses, enums (`OutcomeType`, `GoalStatus`, `Side`), entity types. Zero runtime cost. |
| `circlo-sdk`   | High-level write helpers (`createCircle`, `joinCircle`, `stake`, `claim`, `refund`, `settlement`, `submitVote`, `finalize`), read helpers (`getStakeOf`, `getPoolPerSide`, `getTally`), and event watchers (`watchCircleCreated`, `watchGoalCreated`, `watchStaked`, `watchSettlement`). |

The frontend depends on `circlo-sdk` directly via the workspace
link in dev, and from npm in production builds.

## Roles + governance

| Role | Holder | Purpose |
|---|---|---|
| `DEFAULT_ADMIN_ROLE`  | Deployer + Timelock (PredictionPool) | Grant/revoke other roles |
| `UPGRADER_ROLE`       | Deployer + Timelock (PredictionPool) | Authorize new UUPS impl |
| `PAUSER_ROLE`         | Deployer (PredictionPool, CircleFactory) | Emergency stop `createGoal` + `stake` |
| `FEE_SETTER_ROLE`     | Deployer (PredictionPool) | Set protocol fee bps + recipient |

CircleFactory and ResolutionModule remain Timelock-only for admin /
upgrade — that path requires the 48h scheduled-execution dance from
`sc/script/upgrades/UpgradePredictionPool.s.sol`.
