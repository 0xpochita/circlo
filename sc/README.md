# Circlo Smart Contracts

This document is written for **frontend developers** integrating the Circlo MiniApp with the smart contracts on Celo. It covers every user-facing action, what to call, in what order, and what to expect back.

---

## Network

| Network | Chain ID | RPC (HTTP) | RPC (WS) |
|---|---|---|---|
| Celo Mainnet | 42220 | `https://forno.celo.org` | `wss://forno.celo.org/ws` |
| Celo Sepolia (testnet) | 11142220 | `https://forno.celo-sepolia.celo-testnet.org` | `wss://forno.celo-sepolia.celo-testnet.org/ws` |

---

## Contract Addresses

Fetch live from the backend at startup — **do not hardcode**:

```ts
const res = await fetch('https://api.circlo.app/api/v1/config')
const { contractAddresses, celoChainId } = await res.json()
// contractAddresses.circleFactory
// contractAddresses.predictionPool
// contractAddresses.resolutionModule
// contractAddresses.usdt
```

| Contract | Mainnet | Testnet |
|---|---|---|
| CircleFactory | TBD | TBD |
| PredictionPool | TBD | TBD |
| ResolutionModule | TBD | TBD |
| USDT | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` | MockUSDT (deployed per testnet) |

---

## Getting ABIs

After `forge build`, all ABI files are in `out/`:

```bash
# CircleFactory ABI
cat out/CircleFactory.sol/CircleFactory.json | jq '.abi'

# PredictionPool ABI
cat out/PredictionPool.sol/PredictionPool.json | jq '.abi'

# ResolutionModule ABI
cat out/ResolutionModule.sol/ResolutionModule.json | jq '.abi'
```

Copy the `.abi` arrays into your frontend project. You only need the functions and events your app calls — minimal ABI is fine.

---

## USDT Amounts

**All amounts are USDT with 6 decimal places.**

| Display | On-chain value |
|---|---|
| 1 USDT | `1_000_000` |
| 0.5 USDT | `500_000` |
| 100 USDT | `100_000_000` |

```ts
// Display → on-chain
const toOnChain = (display: string) => parseUnits(display, 6)

// On-chain → display
const toDisplay = (onChain: bigint) => formatUnits(onChain, 6)
```

**Before calling `stake` or (indirectly before `createGoal` if minStake is enforced), the user must approve USDT on PredictionPool.**

---

## Enums

### OutcomeType (used in `createGoal`)
| Value | Meaning |
|---|---|
| `0` | Binary (yes / no) |
| `1` | Multi (multiple choices) |
| `2` | Numeric |

### GoalStatus (returned in `goals()`)
| Value | Meaning | What user can do |
|---|---|---|
| `0` | Open | Stake |
| `1` | Locked | Nothing (transition state) |
| `2` | Resolving | Resolvers vote via ResolutionModule |
| `3` | Resolved | Nothing (transition state, immediately becomes PaidOut) |
| `4` | Disputed | Refund |
| `5` | PaidOut | Claim |

### Sides (for `stake` and vote results)
| Value | Meaning |
|---|---|
| `0` | No |
| `1` | Yes |

`255` (`UNRESOLVED`) means no winner has been set yet — the goal is still ongoing.

---

## User Flows

### 1. Create a Circle

**Step 1** — Call the backend to create the DB record:
```
POST /api/v1/circles
Body: { name, description, category, privacy, avatarEmoji, avatarColor }
```

**Step 2** — Call the contract with the `metadataURI` built from the circle ID:

```ts
import { encodeFunctionData } from 'viem'

const tx = await walletClient.writeContract({
  address: circleFactoryAddress,
  abi: circleFactoryAbi,
  functionName: 'createCircle',
  args: [
    isPrivate,          // bool
    metadataURI,        // string — use the circle URL or backend endpoint
  ],
})
```

The `CircleCreated` event is emitted. The backend indexer picks it up and sets `chainId` on the circle record automatically. No need to call `/confirm` — the indexer handles it.

```solidity
event CircleCreated(uint256 indexed id, address indexed owner, bool isPrivate, string metadataURI);
```

---

### 2. Join a Public Circle

```ts
await walletClient.writeContract({
  address: circleFactoryAddress,
  abi: circleFactoryAbi,
  functionName: 'joinCircle',
  args: [circleChainId],  // uint256 — the on-chain circle ID (circle.chainId from API)
})
```

Reverts with `CircleIsPrivate` if the circle is private. Reverts with `AlreadyMember` if already joined.

---

### 3. Join a Private Circle

Private circles require an EIP-712 invite proof signed by the circle owner. The backend `POST /circles/:id/invite` sends a notification to the invitee; you still need to build the proof on the owner side.

**Building the invite proof (owner side):**

```ts
import { encodeAbiParameters, parseAbiParameters, keccak256, toBytes } from 'viem'

const expiry = BigInt(Math.floor(Date.now() / 1000) + 86400) // 24h from now

// EIP-712 sign
const signature = await walletClient.signTypedData({
  domain: {
    name: 'Circlo',
    version: '1',
    chainId: celoChainId,
    verifyingContract: circleFactoryAddress,
  },
  types: {
    InviteProof: [
      { name: 'circleId', type: 'uint256' },
      { name: 'invitee',  type: 'address' },
      { name: 'expiry',   type: 'uint256' },
    ],
  },
  primaryType: 'InviteProof',
  message: {
    circleId: BigInt(circleChainId),
    invitee:  inviteeAddress,
    expiry,
  },
})

// Pack signature + expiry into inviteProof bytes
const inviteProof = encodeAbiParameters(
  parseAbiParameters('bytes, uint256'),
  [signature, expiry]
)
```

**Joining (invitee side):**

```ts
await walletClient.writeContract({
  address: circleFactoryAddress,
  abi: circleFactoryAbi,
  functionName: 'joinCirclePrivate',
  args: [BigInt(circleChainId), inviteProof],
})
```

Reverts with `InvalidProof` if signed by someone other than the circle owner. Reverts with `ProofExpired` if past expiry.

---

### 4. Create a Goal

**Step 1** — Call the backend to create the DB record and get a `metadataUri`:
```
POST /api/v1/goals
Body: { circleId, title, description, outcomeType, deadline, minStake, resolverIds, ... }
Response: { id, metadataUri }
```

**Step 2** — Approve USDT spending (if not already approved):
```ts
await walletClient.writeContract({
  address: usdtAddress,
  abi: erc20Abi,
  functionName: 'approve',
  args: [predictionPoolAddress, maxUint256], // or exact amount
})
```

**Step 3** — Call `createGoal` on the contract:

```ts
await walletClient.writeContract({
  address: predictionPoolAddress,
  abi: predictionPoolAbi,
  functionName: 'createGoal',
  args: [
    BigInt(circle.chainId),       // uint256 circleId
    outcomeType,                   // 0 = Binary, 1 = Multi, 2 = Numeric
    BigInt(Math.floor(new Date(deadline).getTime() / 1000)), // uint64 unix timestamp
    parseUnits(minStake, 6),       // uint128 minStake (6 decimals)
    resolverWalletAddresses,       // address[] — must all be circle members
    metadataUri,                   // string from step 1
  ],
})
```

**Step 4** — Notify the backend:
```
POST /api/v1/goals/:id/confirm
Body: { chainId: <on-chain goalId from event>, txHash }
```

The `GoalCreated` event is emitted and also picked up by the indexer. `/confirm` is the reliable way to link the tx hash quickly without waiting for indexer.

```solidity
event GoalCreated(
  uint256 indexed id,
  uint256 indexed circleId,
  address indexed creator,
  uint8 outcomeType,
  uint64 deadline,
  uint128 minStake,
  address[] resolvers,
  string metadataURI
);
```

**Constraints:**
- Deadline must be at least 1 hour in the future
- At least 1 resolver, at most 32
- All resolvers must be members of the circle
- Caller must be a circle member
- Reverts when contract is paused

---

### 5. Stake on a Goal

**Step 1** — Approve USDT (if allowance is insufficient):
```ts
const allowance = await publicClient.readContract({
  address: usdtAddress,
  abi: erc20Abi,
  functionName: 'allowance',
  args: [userAddress, predictionPoolAddress],
})

if (allowance < amountToStake) {
  await walletClient.writeContract({
    address: usdtAddress,
    abi: erc20Abi,
    functionName: 'approve',
    args: [predictionPoolAddress, maxUint256],
  })
}
```

**Step 2** — Stake:
```ts
await walletClient.writeContract({
  address: predictionPoolAddress,
  abi: predictionPoolAbi,
  functionName: 'stake',
  args: [
    BigInt(goal.chainId),      // uint256 goalId
    side,                       // uint8 — 0 = No, 1 = Yes
    parseUnits(amount, 6),      // uint256 amount (6 decimals)
  ],
})
```

**Constraints:**
- `amount` ≥ `goal.minStake`
- Goal status must be `Open` (0)
- Must be before `deadline`
- Cannot switch sides: if you staked on `Yes`, you cannot stake on `No` later
- Caller must be a circle member
- Reverts when contract is paused

---

### 6. Lock a Goal (trigger voting)

Anyone can call `lockGoal` after `deadline` has passed. This transitions the goal from `Open` → `Resolving` and starts the resolver vote window.

```ts
await walletClient.writeContract({
  address: predictionPoolAddress,
  abi: predictionPoolAbi,
  functionName: 'lockGoal',
  args: [BigInt(goal.chainId)],
})
```

Reverts if called before `deadline`. Reverts if goal is not `Open`.

The backend cron job also calls this automatically for all expired open goals, so the frontend doesn't need to trigger it manually — but you can show a "Lock Goal" button for UX purposes.

---

### 7. Submit a Vote (resolvers only)

Only users listed as resolvers at goal creation can call this. The vote window is 72 hours from when `lockGoal` was called.

```ts
await walletClient.writeContract({
  address: resolutionModuleAddress,
  abi: resolutionModuleAbi,
  functionName: 'submitVote',
  args: [
    BigInt(goal.chainId),  // uint256 goalId
    choice,                 // uint8 — 0 = No, 1 = Yes
  ],
})
```

Finalization is **automatic** when quorum (51% of resolvers) is reached — you don't need to call `finalize`. If the vote window expires without quorum, anyone can call `finalize` to settle it.

---

### 8. Claim Winnings

Only available when goal status is `PaidOut` (5). Only winners (correct side) can claim.

```ts
await walletClient.writeContract({
  address: predictionPoolAddress,
  abi: predictionPoolAbi,
  functionName: 'claim',
  args: [BigInt(goal.chainId)],
})
```

**Payout formula:**
```
payout = yourStake + (yourStake × losingPool) / winningPool
```

Special case: if nobody staked on the winning side, the losing-side stakers get their stake back 1:1.

Reverts with `NothingToClaim` if not a winner. Reverts with `AlreadyClaimed` if already claimed.

---

### 9. Refund (Disputed Goals)

Only available when goal status is `Disputed` (4). All stakers (both sides) get their full stake back.

```ts
await walletClient.writeContract({
  address: predictionPoolAddress,
  abi: predictionPoolAbi,
  functionName: 'refund',
  args: [BigInt(goal.chainId)],
})
```

Reverts with `NothingToClaim` if user has no stake. Reverts with `AlreadyClaimed` if already refunded.

---

## Reading Chain Data

Use these to display up-to-date on-chain state in the UI. The backend also mirrors most of this, but reading directly from chain is useful for real-time values.

### Goal state

```ts
const goal = await publicClient.readContract({
  address: predictionPoolAddress,
  abi: predictionPoolAbi,
  functionName: 'goals',
  args: [BigInt(goalChainId)],
})
// Returns: { circleId, creator, outcomeType, status, deadline, minStake, totalPool, winningSide, metadataURI }
```

### Pool per side (total staked on each side)

```ts
const yesPool = await publicClient.readContract({
  address: predictionPoolAddress,
  abi: predictionPoolAbi,
  functionName: 'poolPerSide',
  args: [BigInt(goalChainId), 1],  // 1 = Yes
})

const noPool = await publicClient.readContract({
  address: predictionPoolAddress,
  abi: predictionPoolAbi,
  functionName: 'poolPerSide',
  args: [BigInt(goalChainId), 0],  // 0 = No
})
```

### User's stake on a goal

```ts
const myStake = await publicClient.readContract({
  address: predictionPoolAddress,
  abi: predictionPoolAbi,
  functionName: 'stakeOf',
  args: [BigInt(goalChainId), userAddress, side],  // side: 0 or 1
})
```

### Whether user has already claimed

```ts
// This is an internal mapping — check via the backend API /goals/:id/participants
// or watch for the Claimed event
```

### Vote tally

```ts
const [counts, total] = await publicClient.readContract({
  address: resolutionModuleAddress,
  abi: resolutionModuleAbi,
  functionName: 'getTally',
  args: [BigInt(goalChainId)],
})
// counts[0] = votes for No, counts[1] = votes for Yes
// total = total votes cast
```

### Check if user is a resolver

```ts
const isResolver = await publicClient.readContract({
  address: predictionPoolAddress,
  abi: predictionPoolAbi,
  functionName: 'isResolver',
  args: [BigInt(goalChainId), userAddress],
})
```

### Check circle membership

```ts
const isMember = await publicClient.readContract({
  address: circleFactoryAddress,
  abi: circleFactoryAbi,
  functionName: 'isCircleMember',
  args: [BigInt(circleChainId), userAddress],
})
```

---

## Events Summary

Listen to these events to update UI state without polling:

| Contract | Event | When it fires |
|---|---|---|
| CircleFactory | `CircleCreated(id, owner, isPrivate, metadataURI)` | New circle created |
| CircleFactory | `CircleJoined(id, member)` | Member joined |
| CircleFactory | `CircleLeft(id, member)` | Member left |
| PredictionPool | `GoalCreated(id, circleId, creator, ...)` | New goal created |
| PredictionPool | `Staked(goalId, user, side, amount)` | Someone staked |
| PredictionPool | `GoalLocked(goalId)` | Goal passed deadline, vote started |
| PredictionPool | `GoalResolved(goalId, winningSide)` | Winning side determined |
| PredictionPool | `GoalRefunded(goalId)` | Goal disputed, refunds available |
| PredictionPool | `Claimed(goalId, user, amount)` | User claimed reward |
| ResolutionModule | `VoteSubmitted(goalId, resolver, choice)` | Resolver voted |
| ResolutionModule | `GoalFinalized(goalId, winningChoice)` | Quorum reached, winner set |
| ResolutionModule | `GoalDisputed(goalId)` | Tie vote or expired window |

---

## Error Handling

All custom errors are ABI-encoded. Map them to user-friendly messages:

### CircleFactory errors

| Error | User-facing message |
|---|---|
| `CircleNotFound` | Circle does not exist |
| `AlreadyMember` | You are already in this circle |
| `NotMember` | You are not in this circle |
| `OwnerCannotLeave` | The owner cannot leave the circle |
| `NotCircleOwner` | Only the circle owner can do this |
| `CircleIsPrivate` | This circle is invite-only |
| `InvalidProof` | Invalid invite link |
| `ProofExpired` | This invite link has expired |

### PredictionPool errors

| Error | User-facing message |
|---|---|
| `NotCircleMember` | You must join the circle first |
| `DeadlineTooSoon` | Deadline must be at least 1 hour away |
| `NoResolvers` | At least one resolver is required |
| `TooManyResolvers` | Maximum 32 resolvers allowed |
| `ResolverNotMember` | All resolvers must be circle members |
| `GoalNotOpen` | This goal is no longer accepting stakes |
| `GoalNotPaidOut` | Results not finalized yet |
| `GoalNotDisputed` | This goal was not disputed |
| `DeadlineNotPassed` | Goal deadline has not passed yet |
| `DeadlinePassed` | Staking period has ended |
| `BelowMinStake` | Amount is below the minimum stake |
| `CannotSwitchSides` | You cannot change your vote after staking |
| `NothingToClaim` | Nothing to claim for this goal |
| `AlreadyClaimed` | You have already claimed |

### ResolutionModule errors

| Error | User-facing message |
|---|---|
| `AlreadyFinalized` | This goal has already been resolved |
| `AlreadyVoted` | You have already submitted your vote |
| `NotResolver` | You are not a resolver for this goal |
| `VoteWindowExpired` | The voting window has closed |
| `CannotFinalizeYet` | Quorum not reached and window still open |

### Catching errors in viem

```ts
import { ContractFunctionRevertedError } from 'viem'

try {
  await walletClient.writeContract({ ... })
} catch (err) {
  if (err instanceof ContractFunctionRevertedError) {
    const errorName = err.data?.errorName
    // Map errorName to user message using the tables above
    console.log(errorName) // e.g. "BelowMinStake"
  }
}
```

---

## Full Integration Checklist

Before shipping, verify:

- [ ] Fetch contract addresses from `/api/v1/config` on startup
- [ ] Check USDT allowance before every `stake` call — prompt approve if needed
- [ ] Show `goal.minStake` (from API, formatted as `formatUnits(minStake, 6)`) in the stake UI
- [ ] Use `goal.chainId` (not `goal.id`) when calling contracts
- [ ] Use `circle.chainId` (not `circle.id`) when calling contracts
- [ ] Handle `null` chainId — circle/goal is pending on-chain confirmation, disable contract actions
- [ ] `deadline` from API is ISO string — convert to unix timestamp (`BigInt(Math.floor(new Date(deadline).getTime() / 1000))`) for `createGoal`
- [ ] After `createGoal` on-chain, call `POST /goals/:id/confirm` with the on-chain goalId and txHash
- [ ] After `joinCircle` on-chain, the backend indexer updates membership — re-fetch after tx confirms
- [ ] `winningSide` of `255` means unresolved — do not display as a side choice
- [ ] `claim` is only available at status `PaidOut` (5), not `Resolved` (3)
- [ ] `refund` is only available at status `Disputed` (4)

---

## Dev / Test Commands

```bash
# Build contracts + generate ABI artifacts
forge build

# Run all tests (61 tests)
forge test

# Run with gas output
forge test --gas-report

# Deploy to testnet
forge script script/Deploy.s.sol \
  --rpc-url celo_sepolia \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  -vvvv
```
