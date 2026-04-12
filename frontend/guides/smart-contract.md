# Circlo — Smart Contract Specification

> Target audience: smart contract developer (Solidity + Foundry) deploying Circlo to Celo.
> Pairs with `flow.md` and `backend.md`.

---

## 1. Purpose & Principles

Contracts are the **settlement layer**: they hold USDT stakes, track votes, and distribute payouts. All social/metadata concerns live off-chain.

**Design principles**
- **Non-custodial** — the protocol never takes fees in a form that can be withdrawn by a single admin without timelock.
- **Minimize on-chain data** — store hashes / ids, not strings. Metadata URIs point to backend.
- **Idempotent emissions** — every state change emits a precise event for the indexer.
- **Upgrade-aware but safe** — use UUPS proxy (OpenZeppelin) with a 48h timelock on the admin role.
- **Gas friendly** — Celo fees are tiny but users expect sub-cent transactions; avoid loops over unbounded arrays.

---

## 2. Tech Stack

- **Language:** Solidity `^0.8.24`
- **Framework:** Foundry (forge, cast, anvil)
- **Libraries:** OpenZeppelin Contracts v5 (ERC20, AccessControl, ReentrancyGuard, Pausable, UUPSUpgradeable)
- **Chain:** Celo Mainnet (`chainId 42220`), Alfajores testnet (`chainId 44787`)
- **Token:** USDT on Celo (use the canonical bridged address). For testnet, deploy a mock ERC20.
- **Testing:** forge test with fork tests against Alfajores RPC
- **Deployment:** Foundry scripts + `forge verify-contract` against Celoscan

---

## 3. Contract Architecture

```
           ┌─────────────────────┐
           │  CircleFactory      │  creates Circles, tracks membership
           └───────┬─────────────┘
                   │ owns
                   ▼
           ┌─────────────────────┐
           │  PredictionPool     │  holds USDT, tracks goals/stakes/votes
           └───────┬─────────────┘
                   │ uses
                   ▼
           ┌─────────────────────┐
           │  ResolutionModule   │  vote tallying + payout math
           └─────────────────────┘

           ┌─────────────────────┐
           │  RewardDistributor  │  referral + retention bonuses (optional v2)
           └─────────────────────┘
```

You may combine `PredictionPool` + `ResolutionModule` into one contract if gas allows; keeping them separate eases audit and upgrade. Below we describe them as two.

---

## 4. `CircleFactory.sol`

Tracks circles and their membership. Metadata is off-chain.

### State
```solidity
struct Circle {
    address owner;
    bool isPrivate;
    uint64 createdAt;
    string metadataURI; // https://api.circlo.app/circles/<id>
}

mapping(uint256 => Circle) public circles;
mapping(uint256 => mapping(address => bool)) public isMember;
mapping(uint256 => address[]) internal members;
uint256 public nextCircleId;
```

### Functions
```solidity
function createCircle(bool isPrivate, string calldata metadataURI)
    external
    returns (uint256 circleId);

function joinCircle(uint256 circleId) external; // public circles only
function joinCirclePrivate(uint256 circleId, bytes calldata inviteProof) external; // EIP-712 signed invite
function leaveCircle(uint256 circleId) external;
function addMember(uint256 circleId, address member) external; // only owner
function removeMember(uint256 circleId, address member) external; // only owner

function getMembers(uint256 circleId, uint256 offset, uint256 limit)
    external view returns (address[] memory);

function isCircleMember(uint256 circleId, address user) external view returns (bool);
```

### Events
```solidity
event CircleCreated(uint256 indexed id, address indexed owner, bool isPrivate, string metadataURI);
event CircleJoined(uint256 indexed id, address indexed member);
event CircleLeft(uint256 indexed id, address indexed member);
```

### Notes
- `inviteProof` is an EIP-712 signature from the circle owner over `(circleId, invitee, expiry)`; backend issues it when a member taps Invite.
- Keep member list paginated (`offset, limit`) to avoid unbounded gas in views.

---

## 5. `PredictionPool.sol`

Holds USDT. Creates goals. Accepts stakes. Delegates resolution to `ResolutionModule`.

### Types
```solidity
enum OutcomeType { Binary, Multi, Numeric }
enum GoalStatus { Open, Locked, Resolving, Resolved, Disputed, PaidOut }

struct Goal {
    uint256 circleId;
    address creator;
    OutcomeType outcomeType;
    GoalStatus status;
    uint64 deadline;
    uint128 minStake;     // USDT wei (6 dp on Celo USDT, double-check)
    uint128 totalPool;    // sum of all sides
    uint8 winningSide;    // 255 = unresolved
    string metadataURI;
}
```

### Storage
```solidity
mapping(uint256 => Goal) public goals;
mapping(uint256 => mapping(uint8 => uint256)) public poolPerSide;     // goalId => side => pool
mapping(uint256 => mapping(address => mapping(uint8 => uint256))) public stakeOf; // goalId => user => side
mapping(uint256 => address[]) internal resolvers;                     // goalId => resolvers list
mapping(uint256 => mapping(address => bool)) public isResolver;

IERC20 public immutable USDT;
ICircleFactory public immutable factory;
IResolutionModule public resolution;
uint256 public nextGoalId;
uint256 public protocolFeeBps; // 0 for v1
address public feeRecipient;
```

### Functions
```solidity
function createGoal(
    uint256 circleId,
    OutcomeType outcomeType,
    uint64 deadline,
    uint128 minStake,
    address[] calldata resolverList,
    string calldata metadataURI
) external returns (uint256 goalId);

function stake(uint256 goalId, uint8 side, uint256 amount) external;
function lockGoal(uint256 goalId) external; // callable by anyone once deadline passes
function claim(uint256 goalId) external;    // winner withdraws payout
function refund(uint256 goalId) external;   // if goal is DISPUTED (no quorum)

// admin
function setResolutionModule(IResolutionModule m) external onlyRole(ADMIN);
function setFee(uint256 bps, address recipient) external onlyRole(ADMIN);
function pause() external onlyRole(PAUSER);
```

### Invariants
1. `poolPerSide[id][yes] + poolPerSide[id][no] == totalPool`.
2. Sum of `stakeOf[id][user][side]` across users equals `poolPerSide[id][side]`.
3. `status` can only advance forward (no back-transitions).
4. `claim` can only be called when `status == PaidOut` and the caller has a non-zero payout.
5. Contract USDT balance ≥ Σ unclaimed pools.

### Staking rules
- Must be circle member (`factory.isCircleMember(circleId, msg.sender)`).
- Must be before `deadline`.
- `amount >= minStake`.
- Cannot switch sides once staked (enforced by checking existing `stakeOf[id][user][otherSide] == 0`).
- Pulls `amount` via `safeTransferFrom` (requires prior `USDT.approve`).

### Lock and resolution
- `lockGoal` sets status `Locked`, emits event, no further staking.
- `ResolutionModule.startVote(goalId)` is called internally — resolvers can now vote.
- When quorum is reached, `ResolutionModule` calls `PredictionPool.setWinner(goalId, winningSide)` to transition `Resolving → Resolved` and compute per-side payouts.
- `claim` transfers `payout - protocolFee` to the user.

### Payout math (for Binary)
```
userStake      = stakeOf[goalId][user][winningSide]
winningPool    = poolPerSide[goalId][winningSide]
losingPool     = poolPerSide[goalId][losingSide]
payout         = userStake + (userStake * losingPool) / winningPool
```
If `winningPool == 0` (nobody bet on winning side), contract refunds losing-side stakers pro-rata.

---

## 6. `ResolutionModule.sol`

Handles voting. Stateless regarding tokens; all USDT stays in `PredictionPool`.

### Storage
```solidity
struct Vote {
    uint8 choice;
    bool voted;
}

struct Tally {
    mapping(uint8 => uint256) countPerChoice;
    uint256 totalVotes;
    bool finalized;
}

mapping(uint256 => Tally) internal tallies;
mapping(uint256 => mapping(address => Vote)) public votes;

IPredictionPool public immutable pool;
uint256 public quorumNumerator;   // e.g. 51
uint256 public quorumDenominator; // 100
uint256 public voteWindow;        // seconds after lock
```

### Functions
```solidity
function submitVote(uint256 goalId, uint8 choice) external;
function finalize(uint256 goalId) external; // anyone; callable once quorum or voteWindow end
function isResolver(uint256 goalId, address user) external view returns (bool);
function getTally(uint256 goalId) external view returns (uint256[] memory counts, uint256 total);
```

### Rules
- Only addresses in `PredictionPool.resolvers[goalId]` can vote.
- Each resolver votes at most once per goal.
- `finalize` picks the choice with the highest count. Ties → `Disputed`.
- If `voteWindow` passes without quorum → `Disputed` (users can `refund`).

### Events
```solidity
event VoteSubmitted(uint256 indexed goalId, address indexed resolver, uint8 choice);
event GoalFinalized(uint256 indexed goalId, uint8 winningChoice);
event GoalDisputed(uint256 indexed goalId);
```

---

## 7. Full Event List (for the Indexer)

```solidity
// CircleFactory
event CircleCreated(uint256 indexed id, address indexed owner, bool isPrivate, string metadataURI);
event CircleJoined(uint256 indexed id, address indexed member);
event CircleLeft(uint256 indexed id, address indexed member);

// PredictionPool
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
event Staked(uint256 indexed goalId, address indexed user, uint8 side, uint256 amount);
event GoalLocked(uint256 indexed goalId);
event GoalResolved(uint256 indexed goalId, uint8 winningSide);
event GoalRefunded(uint256 indexed goalId);
event Claimed(uint256 indexed goalId, address indexed user, uint256 amount);

// ResolutionModule
event VoteSubmitted(uint256 indexed goalId, address indexed resolver, uint8 choice);
event GoalFinalized(uint256 indexed goalId, uint8 winningChoice);
event GoalDisputed(uint256 indexed goalId);
```

Index every event in the backend indexer (`backend.md` §6).

---

## 8. Access Control

- `DEFAULT_ADMIN_ROLE` — multisig (Safe on Celo) behind a 48h `TimelockController`.
- `PAUSER_ROLE` — can pause `stake` / `createGoal` in emergencies.
- `UPGRADER_ROLE` — UUPS upgrade authorizer.
- `FEE_SETTER_ROLE` — rotates `feeRecipient`.

Use `AccessControlUpgradeable` + `UUPSUpgradeable`. Never give any single EOA admin rights on mainnet.

---

## 9. Security Checklist

- [ ] `ReentrancyGuard` on `stake`, `claim`, `refund`.
- [ ] `safeTransfer` / `safeTransferFrom` (SafeERC20) for all USDT movement.
- [ ] Clamp stake amounts to `uint128` to prevent overflow (enforce in setter).
- [ ] Validate `deadline > block.timestamp + minDuration` on create.
- [ ] Validate `resolverList.length > 0` and `<= 32` (prevent DoS).
- [ ] Check-effects-interactions order on every state transition.
- [ ] Double-spend protection: `votes[goalId][user].voted` gate.
- [ ] Stuck-funds recovery: after dispute window, users can `refund` their stake.
- [ ] Mutable config (fee, quorum) bounded to safe ranges.
- [ ] Emergency pause does not freeze claims, only new stakes.

---

## 10. Testing Plan (Foundry)

Unit tests in `test/unit/`:
- `CircleFactory` — create, join, private invite verification, leave, double-join revert.
- `PredictionPool` — create goal validation, stake rules, flip-side revert, claim math for 2/3/many participants, refund path.
- `ResolutionModule` — quorum, tie, expiry, double-vote revert, unauthorized resolver.

Integration tests in `test/integration/`:
- End-to-end: create circle → create goal → 3 users stake → resolvers vote → winners claim.
- Fee recipient receives fees if `protocolFeeBps > 0`.
- Upgrade: `upgradeToAndCall` preserves storage.

Fuzz tests:
- `stake(goalId, side, amount)` with random amounts.
- `claim` after arbitrary winning distributions.

Invariant tests:
- Contract USDT balance ≥ unclaimed pool.
- Sum of stakes per side matches `poolPerSide`.

Fork tests against Alfajores with real USDT token.

---

## 11. Deployment Flow

1. Deploy `CircleFactory` implementation + UUPS proxy.
2. Deploy `ResolutionModule` implementation + proxy.
3. Deploy `PredictionPool` implementation + proxy with `USDT`, `CircleFactory`, `ResolutionModule` wired up.
4. Grant roles to the Safe multisig + timelock.
5. Renounce deployer's admin role.
6. Verify contracts on Celoscan.
7. Publish addresses to backend `.env`:

```
CONTRACT_CIRCLE_FACTORY=0x...
CONTRACT_PREDICTION_POOL=0x...
CONTRACT_RESOLUTION_MODULE=0x...
CONTRACT_USDT=0x...
```

8. Backfill indexer from deployment block.

---

## 12. Gas & UX Notes

- Celo gas is cheap, but batch operations where reasonable (e.g. allow `stake` to skip extra storage reads with cached `Goal memory`).
- `createGoal` is the heaviest call because of the resolver list — benchmark with 10 resolvers.
- `claim` path should be < 100k gas to feel instant.
- Consider a relayer (ERC-2771) in v2 so users without CELO for gas can still stake (pay fees in USDT via MiniPay's gas abstraction).

---

## 13. Open Questions for the Architect

1. **Outcome types beyond Binary** — initial release is Binary only; Multi and Numeric are gated behind a future release. Align on scope.
2. **Claim vs. push payouts** — v1 uses pull (`claim`). v2 may auto-distribute via a relayer.
3. **Dispute escalation** — if both `quorum` fails and `voteWindow` expires, refund is the safe default. A jury / arbitration system is out of scope.
4. **Referral rewards source** — treasury contract vs. off-chain sponsor. Decide before launching the Referral page at scale.
5. **Chain abstraction** — assume Celo mainnet only for v1. Cross-chain is explicitly out of scope.

---

## 14. Deliverables for Smart Contract Dev

- [ ] Foundry project with `forge build` / `forge test` passing.
- [ ] README with architecture diagram, function reference, deploy steps.
- [ ] NatSpec on every external function.
- [ ] Gas report checked in (`forge snapshot`).
- [ ] Slither / Aderyn static-analysis run, findings triaged.
- [ ] Alfajores deployment addresses + verification links.
- [ ] Mainnet deployment runbook with rollback plan.
- [ ] ABI artifacts exported for frontend and backend consumption.
