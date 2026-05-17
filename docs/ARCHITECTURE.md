# Circlo Architecture

This document covers the moving parts in Circlo and how they connect. For
the user-facing pitch / business model, see the top-level [README](../README.md).

## Repository Layout

```
circlo/
├── frontend/         # Next.js app (Vercel) — MiniPay-first UX, wagmi+viem, circlo-sdk consumer
├── backend/          # Fastify API + indexer + BullMQ jobs (Railway), Prisma → Postgres, Redis pub/sub
├── sc/               # Foundry workspace — Solidity 0.8.24, UUPS upgradeable proxies
└── packages/
    ├── circlo-types/ # ABIs, contract addresses, enums, entity types (npm: circlo-types)
    └── circlo-sdk/   # High-level viem wrappers + event subscriptions (npm: circlo-sdk)
```

## Runtime Topology

Three deployable units + the chain:

| Service | Hosts | Owns | Talks to |
|---|---|---|---|
| Frontend | Vercel | UI, SIWE login, wagmi wallet connection, circlo-sdk calls | Backend REST + WebSocket, Celo RPC |
| Backend  | Railway | REST API, JWT auth, indexer, cron jobs, WS gateway | Postgres, Redis, Celo RPC, frontend over WS |
| Smart contracts | Celo Mainnet (chainId 42220) | Source of truth for circles, goals, stakes, resolution | USDT (Tether on Celo) |

## Smart Contract Set

Four UUPS-upgradeable contracts plus the stake token:

```
CircleFactory ──────► (membership source of truth)
       ▲
       │ isCircleMember()
       │
PredictionPool ◄──────── ResolutionModule
       │                       │
       │  stake/claim          │ submitVote → setWinner
       ▼                       ▼
    USDT (Celo)         (vote tally → finalize winning side)

RewardDistributor ◄──── (referral bonuses, separate from main flow)
TimelockController ──── (admin queue for upgrades + role grants)
```

Concretely:

- **CircleFactory** — `createCircle`, `joinCircle`, `joinCirclePrivate` (EIP-712 invite proof), `leaveCircle`, membership reads
- **PredictionPool** — `createGoal`, `stake`, `lockGoal`, `claim`, `refund` + the goal struct (`circleId, creator, outcomeType, status, deadline, minStake, totalPool, winningSide, metadataURI`)
- **ResolutionModule** — `submitVote(goalId, choice)`, `finalize(goalId)`, `getTally(goalId)` — auto-finalizes when quorum hit
- **RewardDistributor** — referral bonus pool (UUPS, gated by `OPERATOR` role, deployed but not yet integrated end-to-end)
- **TimelockController** — owner of admin roles on the other proxies; required to wait before upgrade execution

All addresses on Celo Mainnet are listed in [`packages/circlo-types/src/contracts.ts`](../packages/circlo-types/src/contracts.ts) and in the [main README](../README.md#contract-addresses-celo-mainnet).

## Frontend → Chain Path

The frontend talks to Celo through two layers:

1. **wagmi v2 + viem** — wallet connection (`useAccount`, `useWalletClient`) + read client (`usePublicClient`).
2. **circlo-sdk** — thin wrapper that knows the deployed addresses + ABIs:

```ts
import { createCircloClient } from "circlo-sdk";
import { useWalletClient, usePublicClient } from "wagmi";

const { data: walletClient } = useWalletClient();
const publicClient = usePublicClient();
const circlo = createCircloClient({ walletClient, publicClient });

await circlo.joinCircle(42n);
await circlo.stake({ goalId: 117n, side: Side.Yes, amount: parseUnits("1", 6) });
```

`stake()` is the only SDK method that handles a two-step approve+stake flow internally — the rest are 1:1 with their on-chain counterparts.

Frontend call sites currently using the SDK:

- `LeaveButton.tsx` → `circlo.leaveCircle`
- `JoinButton.tsx` → `circlo.joinCircle`
- `LockMarketButton.tsx` → `circlo.getGoal` + `circlo.lockGoal`
- `accept-invite/page.tsx` → `circlo.joinPrivateCircle`
- `useChainStats` hook → `circlo.getCircleNextId` + `circlo.getGoalNextId`

The `useContract` hook still wraps `useWriteContract` directly for the high-risk write paths (stake, claim, createCircle, createGoal) — those stay on raw wagmi until the SDK has been battle-tested against real user funds.

## Backend Indexer

The backend mirrors the chain into Postgres so the frontend can query without paying RPC latency for every list view.

```
              ┌────────────────────────────────┐
              │       backend/indexer          │
              │                                │
   Cold start │  1. read last_block from DB    │
   ────────►  │  2. getLogs(last..now) backfill│
              │  3. switch to live watchers    │
              │     • CircleCreated/Joined     │
              │     • GoalCreated/Locked       │
              │     • Staked/Claimed           │
              │     • VoteSubmitted/Resolved   │
              │  4. dispatch → handlers/*.ts   │
              │     (idempotent upserts)       │
              │  5. write last_block on success│
              └────────────────┬───────────────┘
                               │
                               ▼ via prisma + redis pub/sub
              ┌────────────────────────────────┐
              │  Postgres ←── reads ── REST    │
              │  Redis    ←── pub  ── WS Gw    │
              └────────────────────────────────┘
```

Handlers are idempotent — every event row writes deterministic IDs (e.g. `${txHash}-${logIndex}`) so a replay never double-inserts. The indexer can restart from any block without producing duplicate notifications.

## Background Jobs

BullMQ workers (also part of the backend process):

| Job | Cron | What |
|---|---|---|
| `lockExpiredGoals` | every 1m | scans goals past deadline still in `Open` state, calls `lockGoal()` on-chain via a server-side wallet |
| `detectDisputes` | every 5m | finds locked goals where resolver tally hasn't reached quorum within the dispute window, marks them disputed |
| `processReferrals` | event-driven | listens for retention milestones, emits signed payloads for `RewardDistributor.claimRetentionBonus` |

## Data Flow on a Stake

End-to-end what happens when a user stakes:

```
1. Frontend: user clicks "Stake 1 USDT on YES"
2. Frontend: circlo.stake({ goalId, side: Yes, amount })  [circlo-sdk]
   ├── reads USDT allowance for PredictionPool
   ├── if low → wallet.writeContract(USDT.approve)        [user signs]
   └── wallet.writeContract(PredictionPool.stake)          [user signs]
3. Celo Mainnet: PredictionPool emits Staked event
4. Backend indexer: getLogs picks up the event
   ├── handler upserts a Stake row in Postgres
   ├── handler reads stakeOf(goalId, user, side) on-chain for canonical amount
   └── publishes "stake_placed" on Redis pub/sub
5. Backend WS gateway: relays to subscribed frontend sockets
6. Frontend: receives WS event → invalidates query cache → UI updates
```

The two on-chain reads (allowance + stakeOf) are intentional — they keep the backend's view consistent with what the contract really thinks, immune to event-replay edge cases.

## Why Two NPM Packages

`circlo-types` is the lowest-level package — no runtime dependencies, only the contract metadata. Indexers, bots, and any script that needs to call the contracts can install it without pulling in viem or any other heavy dep.

`circlo-sdk` depends on `circlo-types` and adds a viem-flavored API surface on top: write helpers, event watchers, typed errors. It's what the frontend uses.

Splitting them lets read-only / off-chain consumers (e.g. a Discord bot that just wants to format event payloads) avoid the SDK's footprint.

## See Also

- [`backend/docs/API.md`](../backend/docs/API.md) — 28 REST endpoints
- [`sc/docs/MAINNET_DEPLOY.md`](../sc/docs/MAINNET_DEPLOY.md) — deployer wallet, deploy block, env vars
- [`packages/circlo-sdk/README.md`](../packages/circlo-sdk/README.md) — full SDK usage examples
- [`packages/circlo-sdk/CHANGELOG.md`](../packages/circlo-sdk/CHANGELOG.md) — release notes
