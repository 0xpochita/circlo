# circlo-types

> TypeScript types, ABIs, and contract addresses for [Circlo](https://circlo-nine.vercel.app) — a social prediction game on Celo Mainnet.

[![npm version](https://img.shields.io/npm/v/circlo-types.svg)](https://www.npmjs.com/package/circlo-types)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## What is Circlo?

Circlo turns verbal predictions between friends into onchain accountability. Create private circles, set goals with deadlines, stake USDT on yes/no outcomes, and let designated resolvers settle the result.

This package gives you everything you need to integrate Circlo into your own dApp, indexer, or bot:

- ✅ Deployed contract addresses (Celo Mainnet, chainId 42220)
- ✅ Minimal but complete ABIs typed as `as const` for full viem inference
- ✅ TypeScript enums (`OutcomeType`, `GoalStatus`, `Side`)
- ✅ Entity types (`Circle`, `Goal`, `Stake`, etc)
- ✅ Helpers for parsing on-chain metadata JSON

## Install

```bash
npm install circlo-types
# or
pnpm add circlo-types
# or
yarn add circlo-types
```

If you're calling contracts you'll also want [viem](https://viem.sh/):

```bash
npm install viem
```

## Quick start

### Read the next circle ID

```typescript
import { createPublicClient, http } from "viem";
import { celo } from "viem/chains";
import { CIRCLO_CONTRACTS, CIRCLE_FACTORY_ABI } from "circlo-types";

const client = createPublicClient({
  chain: celo,
  transport: http(),
});

const nextCircleId = await client.readContract({
  address: CIRCLO_CONTRACTS.CircleFactory,
  abi: CIRCLE_FACTORY_ABI,
  functionName: "nextCircleId",
});

console.log(`Next circle ID will be: ${nextCircleId}`);
```

### Get goal details

```typescript
import { CIRCLO_CONTRACTS, PREDICTION_POOL_ABI, GoalStatus } from "circlo-types";

const goal = await client.readContract({
  address: CIRCLO_CONTRACTS.PredictionPool,
  abi: PREDICTION_POOL_ABI,
  functionName: "goals",
  args: [1n],
});

// goal returns a tuple: [circleId, creator, outcomeType, status, deadline, minStake, totalPool, winningSide, metadataURI]
const [, creator, , status, deadline] = goal;
console.log({ creator, deadline });

if (status === GoalStatus.PaidOut) {
  console.log("Goal is settled — winners can claim.");
}
```

### Listen for CircleCreated events

```typescript
import { CIRCLO_CONTRACTS, CIRCLE_FACTORY_ABI, parseCircleMetadata } from "circlo-types";

const logs = await client.getLogs({
  address: CIRCLO_CONTRACTS.CircleFactory,
  event: CIRCLE_FACTORY_ABI.find((x) => x.type === "event" && x.name === "CircleCreated"),
  fromBlock: 64716981n,
});

for (const log of logs) {
  const meta = parseCircleMetadata(log.args.metadataURI);
  console.log(`Circle #${log.args.id}: ${meta?.name ?? "(unnamed)"}`);
}
```

### Create a circle (write)

```typescript
import { createWalletClient, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo } from "viem/chains";
import { CIRCLO_CONTRACTS, CIRCLE_FACTORY_ABI } from "circlo-types";

const account = privateKeyToAccount("0x...");
const wallet = createWalletClient({ account, chain: celo, transport: http() });

const metadataURI = JSON.stringify({
  name: "Gym Squad",
  description: "Keep each other accountable on workouts",
  category: "fitness",
  avatarEmoji: "💪",
  avatarColor: "#ef4444",
});

const hash = await wallet.writeContract({
  address: CIRCLO_CONTRACTS.CircleFactory,
  abi: CIRCLE_FACTORY_ABI,
  functionName: "createCircle",
  args: [false, metadataURI],
});

console.log(`Tx hash: ${hash}`);
```

## Contracts

| Contract | Address (Celo Mainnet) |
|---|---|
| CircleFactory | `0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab` |
| PredictionPool | `0xE9cFa67358476194414ae3306888FfeCb8f41139` |
| ResolutionModule | `0x5861CAAFDCAc4313f2c9941C4fd1291B34C2c4f5` |
| USDT (stake token) | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |

Inspect on [Celoscan](https://celoscan.io/address/0x6cB74ce06E35caEfaFA1491769DeeeA46aebe6Ab).

## Full source

This package is auto-generated from the canonical Circlo repo:
[github.com/alventendrawan123/circlo](https://github.com/alventendrawan123/circlo).

For the complete ABIs (including upgrade/admin methods), see [frontend/src/lib/abis](https://github.com/alventendrawan123/circlo/tree/main/frontend/src/lib/abis).

## License

MIT © Alven Tendrawan
