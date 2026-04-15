# Circlo Smart Contract Security Audit

> **Date:** April 15, 2026
> **Auditor:** Automated Code Review
> **Scope:** All production contracts in `src/`
> **Solidity:** 0.8.24 | **Framework:** Foundry

---

## Executive Summary

The Circlo smart contract suite consists of 5 core contracts (~635 lines of production code). All 61 tests pass. The codebase demonstrates good security practices with proper use of OpenZeppelin libraries, access control, and reentrancy protection.

**Overall Risk: MODERATE** — No critical vulnerabilities found, but several high/medium findings must be addressed before mainnet.

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 4 |
| Medium | 6 |
| Low | 6 |
| Informational | 7 (positive) |

---

## Contracts Audited

| Contract | Lines | Description |
|----------|-------|-------------|
| `CircleFactory.sol` | 164 | Circle creation, membership, EIP-712 private invites |
| `PredictionPool.sol` | 264 | Goal creation, staking, claiming, fee management |
| `ResolutionModule.sol` | 137 | Resolver voting, quorum, finalization |
| `RewardDistributor.sol` | 70 | Referral/retention rewards (stub) |
| `MockUSDT.sol` | 23 | Test token (not audited) |

---

## HIGH Severity

### H1: Missing Zero Address Validation in `setFee()`

**File:** `PredictionPool.sol` L249-253

The `setFee()` function accepts `feeRecipient` without validating against `address(0)`. If misconfigured, all protocol fees are permanently burned.

```solidity
function setFee(uint256 bps, address recipient) external onlyRole(FEE_SETTER_ROLE) {
    if (bps > 1000) revert FeeTooHigh();
    protocolFeeBps = bps;
    feeRecipient   = recipient;  // ❌ No zero address check
}
```

**Fix:**
```solidity
if (recipient == address(0)) revert ZeroAddress();
```

---

### H2: Missing Event Emission in `setFee()`

**File:** `PredictionPool.sol` L249-253

Modifies critical state (`protocolFeeBps`, `feeRecipient`) without emitting any event. Backend indexer and frontend cannot detect fee changes.

**Fix:**
```solidity
event FeeUpdated(uint256 indexed feeBps, address indexed recipient);

// ... inside setFee():
emit FeeUpdated(bps, recipient);
```

---

### H3: Missing Event Emission in `markDisputed()`

**File:** `PredictionPool.sol` L231-239

Changes goal status to `Disputed` without emitting an event. Users won't be notified when their goal is disputed.

**Fix:**
```solidity
emit GoalDisputed(goalId);  // Interface already defines this event
```

---

### H4: State Transition Bug in `setWinner()`

**File:** `PredictionPool.sol` L218-229

The function transitions goal status twice: first to `Resolved`, emits event, then immediately overwrites to `PaidOut`. Event listeners see `Resolved` but contract state is `PaidOut`.

```solidity
g.status = GoalStatus.Resolved;
emit GoalResolved(goalId, winningSide);  // Event says "Resolved"
g.status = GoalStatus.PaidOut;           // But immediately overwritten to "PaidOut"
```

**Fix:** Either skip the intermediate state or emit a second event:
```solidity
// Option A: Skip intermediate
g.winningSide = winningSide;
g.status = GoalStatus.PaidOut;
emit GoalResolved(goalId, winningSide);

// Option B: Two events
g.status = GoalStatus.Resolved;
emit GoalResolved(goalId, winningSide);
g.status = GoalStatus.PaidOut;
emit GoalReadyForClaiming(goalId);
```

---

## MEDIUM Severity

### M1: No Defensive Check in `_addMember()`

**File:** `CircleFactory.sol` L153-156

`_addMember()` pushes to array without checking if already a member. While callers guard against this, a future upgrade could bypass the check, causing duplicate entries.

**Fix:**
```solidity
function _addMember(uint256 circleId, address member) internal {
    if (isMember[circleId][member]) return;  // Defensive check
    isMember[circleId][member] = true;
    _members[circleId].push(member);
}
```

---

### M2: Missing Pool Validation in `submitVote()`

**File:** `ResolutionModule.sol` L72-90

`startVote()` checks `address(pool) == address(0)`, but `submitVote()` does not. If `setPool()` was never called, `pool.isResolver()` will revert with a cryptic error.

**Fix:**
```solidity
function submitVote(uint256 goalId, uint8 choice) external {
    if (address(pool) == address(0)) revert PoolNotSet();
    // ...
}
```

---

### M3: Missing Storage Gap (`__gap`) in All Upgradeable Contracts

**Files:** All 4 main contracts

None of the UUPS-upgradeable contracts define `__gap`. Adding state variables in a future upgrade could collide with child contract storage.

**Fix:** Add to end of each contract:
```solidity
uint256[50] private __gap;
```

---

### M4: Vote Choice Not Validated in `submitVote()`

**File:** `ResolutionModule.sol` L72-90

Accepts any `uint8` as `choice` without validating it's 0 or 1. A resolver could submit `choice=99`, counting votes in an unmapped bucket.

**Fix:**
```solidity
if (choice > 1) revert InvalidChoice();
```

---

### M5: Inconsistent Error Style — `require()` vs Custom Errors

**File:** `PredictionPool.sol` L221-224, L234-237

Most of the codebase uses custom errors (gas-efficient, clean), but `setWinner()` and `markDisputed()` use `require("bad status")`.

**Fix:** Replace with custom error:
```solidity
error InvalidGoalStatus();

if (g.status != GoalStatus.Resolving && g.status != GoalStatus.Locked)
    revert InvalidGoalStatus();
```

---

### M6: Missing `_resolution` Validation in `initialize()`

**File:** `PredictionPool.sol` L74-92

`_usdt` and `_factory` are validated for zero address, but `_resolution` is not. If deployed with zero address, `lockGoal()` will fail with uninformative error.

**Fix:**
```solidity
if (_usdt == address(0) || _factory == address(0) || _resolution == address(0))
    revert ZeroAddress();
```

---

## LOW Severity

### L1: Missing NatSpec Documentation

All contracts lack comprehensive `@notice`, `@dev`, `@param` comments on public functions. Reduces maintainability and makes external audit harder.

### L2: RewardDistributor Functions Not Implemented

`claimReferral()` and `claimRetentionBonus()` revert with `NotImplemented()`. This is expected but should be clearly documented.

### L3: No Setter for Quorum Parameters

`ResolutionModule` initializes `quorumNumerator`/`quorumDenominator` but has no setter. Adjusting quorum requires a full contract upgrade.

### L4: `getMembers()` Gas Concern

Already mitigated with pagination. No action needed, but monitor circle sizes.

### L5: Missing Zero-Check in `ResolutionModule.setPool()`

`setPool()` accepts any address without validation. Should check for `address(0)`.

### L6: Consider Adding `setVoteWindow()` Setter

Like quorum, `voteWindow` is immutable after initialization. Consider adding a governed setter.

---

## Positive Findings

| # | Area | Status |
|---|------|--------|
| I1 | Test coverage (61 tests) | Comprehensive |
| I2 | Token handling (SafeERC20) | Correct |
| I3 | Reentrancy protection | Properly applied on all token-transfer functions |
| I4 | Access control (roles + Timelock) | Well-layered, deployer role revoked |
| I5 | Overflow/underflow (Solidity 0.8+) | No unchecked blocks, safe arithmetic |
| I6 | Event emissions | Mostly complete (except H2, H3) |
| I7 | Deployment script | Correct role setup, Timelock governance |

---

## Remediation Priority

### Phase 1 — Must Fix Before Mainnet
1. **H1** — Zero address check in `setFee()`
2. **H2** — Event emission in `setFee()`
3. **H3** — Event emission in `markDisputed()`
4. **H4** — Fix `setWinner()` state transition
5. **M6** — Validate `_resolution` in `initialize()`

### Phase 2 — Should Fix Before Mainnet
6. **M1** — Defensive check in `_addMember()`
7. **M2** — Pool check in `submitVote()`
8. **M4** — Validate vote choice
9. **M5** — Replace `require()` with custom errors
10. **L5** — Zero-check in `setPool()`

### Phase 3 — Nice to Have
11. **M3** — Add `__gap` to all upgradeable contracts
12. **L1** — Add NatSpec documentation
13. **L3** — Quorum setter with governance
14. **L6** — Vote window setter

**Estimated remediation time:** 4-6 hours for all fixes.

---

## Recommendations

1. **Fix Phase 1 issues** — These are blockers for mainnet
2. **Run Slither/Mythril** — Static analysis tools for automated vulnerability scanning
3. **Formal verification** — The claim payout formula (`userStake * losingPool / winningPool`) should be formally verified for edge cases (e.g., all stakes on one side)
4. **Professional audit** — Recommend a full audit by a reputable firm (Trail of Bits, OpenZeppelin, Cyfrin) before mainnet
5. **Bug bounty** — Consider launching an Immunefi bug bounty after deployment

---

> **Disclaimer:** This audit is based on automated code review and does not replace a professional security audit. Always get a manual review from an experienced Solidity auditor before deploying to mainnet with real funds.
