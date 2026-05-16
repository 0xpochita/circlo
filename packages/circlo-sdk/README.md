# circlo-sdk

> High-level TypeScript SDK for [Circlo](https://circlo-nine.vercel.app) — a social prediction game on Celo Mainnet. Wraps [viem](https://viem.sh) with ergonomic helpers for creating circles, staking on goals, and listening to onchain events.

[![npm version](https://img.shields.io/npm/v/circlo-sdk.svg)](https://www.npmjs.com/package/circlo-sdk)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Why use this instead of viem directly?

You _can_ call the Circlo contracts directly with viem and the ABIs from [`circlo-types`](https://www.npmjs.com/package/circlo-types) — that's what this SDK does under the hood. But you'd be writing the same boilerplate every time:

- Looking up the right contract address per call
- Building the metadataURI JSON string
- Calling `approve` on USDT before staking, but only if the allowance is too low
- Waiting for the receipt and parsing event logs to get the new `circleId` or `goalId`

`circlo-sdk` rolls all of that into one call per user-facing action.

## Install

```bash
npm install circlo-sdk viem
```

`viem` is a peer dependency.

## Quick start

```typescript
import { createCircloClient, Side } from "circlo-sdk";
import { createWalletClient, createPublicClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";

const account = privateKeyToAccount("0x...");
const walletClient = createWalletClient({ account, chain: celo, transport: http() });
const publicClient = createPublicClient({ chain: celo, transport: http() });

const circlo = createCircloClient({ walletClient, publicClient });

// 1. Create a circle
const { circleId } = await circlo.createCircle({
  name: "Gym Squad",
  privacy: "public",
  avatarEmoji: "💪",
  avatarColor: "#ef4444",
});

// 2. Create a goal inside it (1-hour deadline, 0.10 USDT minimum)
const { goalId } = await circlo.createGoal({
  circleId,
  question: "Will I hit 10k steps today?",
  deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
  minStake: parseUnits("0.10", 6),
});

// 3. Stake 1 USDT on YES (auto-handles USDT approve if needed)
await circlo.stake({
  goalId,
  side: Side.Yes,
  amount: parseUnits("1", 6),
});

// 4. After the goal resolves, claim winnings
await circlo.claim(goalId);
```

## Available methods

### Circles

| Method | Description |
|---|---|
| `createCircle(params)` | Deploy a new circle. Returns `{ hash, circleId, metadataURI }`. |
| `joinCircle(circleId)` | Join a public circle. |
| `joinPrivateCircle(circleId, inviteProof)` | Join a private circle with an EIP-712 signed inviteProof. |
| `leaveCircle(circleId)` | Leave a circle the caller is a member of. |
| `isCircleMember(circleId, user)` | Read — true if `user` is a member. |
| `getCircleMembers(circleId, offset?, limit?)` | Read — paginated member list. |

### Goals

| Method | Description |
|---|---|
| `createGoal(params)` | Create a goal inside a circle. Returns `{ hash, goalId, metadataURI }`. |
| `lockGoal(goalId)` | Lock a goal after its deadline — anyone can call this. |
| `getGoal(goalId)` | Read the full goal tuple. |

### Stakes

| Method | Description |
|---|---|
| `stake(params)` | Stake USDT on a side. Auto-handles approve if `autoApprove !== false`. |
| `getStakeOf(goalId, user, side)` | Read — a user's stake on one side. |
| `getPoolPerSide(goalId, side)` | Read — total pool on one side. |

### Claims

| Method | Description |
|---|---|
| `claim(goalId)` | Collect a winning payout after the goal resolved. |
| `refund(goalId)` | Get the original stake back if the goal was cancelled. |

### Event subscriptions

| Helper | Description |
|---|---|
| `watchCircleCreated(client, cb)` | Stream every new CircleCreated event. |
| `watchGoalCreated(client, cb, { circleId? })` | Stream GoalCreated, optionally filtered by circle. |
| `watchStaked(client, cb, { goalId? })` | Stream Staked, optionally filtered by goal. |

### Pure helpers (no chain needed)

| Helper | Description |
|---|---|
| `buildCircleMetadata(input)` | Build the metadataURI JSON for a circle. |
| `buildGoalMetadata(input)` | Build the metadataURI JSON for a goal. |

## Read-only usage

If you only need reads (e.g. for an indexer or analytics dashboard), you can construct the client without a walletClient:

```typescript
import { createCircloClient } from "circlo-sdk";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

const circlo = createCircloClient({
  publicClient: createPublicClient({ chain: celo, transport: http() }),
});

const members = await circlo.getCircleMembers(1n);
```

Calling a write method (like `createCircle`) on a read-only client throws a clear error instead of silently failing.

## Listening to events

```typescript
import { createCircloClient, watchGoalCreated } from "circlo-sdk";
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";

const publicClient = createPublicClient({ chain: celo, transport: http() });

// Subscribe to every new goal created in circle #1
const unsubscribe = watchGoalCreated(
  publicClient,
  ({ id, creator, deadline, metadataURI }) => {
    console.log(`new goal #${id} by ${creator}, deadline=${deadline}`);
  },
  { circleId: 1n },
);

// Later: stop listening
unsubscribe();
```

## Full source

This package is published from the canonical Circlo monorepo:
[github.com/alventendrawan123/circlo](https://github.com/alventendrawan123/circlo). The contract addresses and ABIs come from the [`circlo-types`](https://www.npmjs.com/package/circlo-types) sibling package.

## License

MIT © Alven Tendrawan
