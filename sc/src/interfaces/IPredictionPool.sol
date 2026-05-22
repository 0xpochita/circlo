// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IPredictionPool
/// @notice External interface for PredictionPool — the core escrow +
///         lifecycle contract that holds USDT stakes and pays out
///         winners proportionally.
/// @dev Consumed by ResolutionModule for callbacks (setWinner /
///      markDisputed) and by all off-chain indexers + frontends.
interface IPredictionPool {
    /// @notice Outcome model for a goal.
    /// @dev Today only `Binary` (YES/NO) is supported; Multi + Numeric
    ///      are reserved enum slots for future outcome types.
    enum OutcomeType { Binary, Multi, Numeric }

    /// @notice Lifecycle states a goal can be in.
    /// @dev Standard transitions:
    ///        Open → Locked (via lockGoal after deadline)
    ///        Locked → Resolving (via ResolutionModule.startVote)
    ///        Resolving → PaidOut (via setWinner) or Disputed (via markDisputed)
    ///        Resolved is reserved; current flow goes straight to PaidOut.
    enum GoalStatus { Open, Locked, Resolving, Resolved, Disputed, PaidOut }

    /// @notice On-chain shape of a goal.
    struct Goal {
        /// @notice Circle this goal belongs to.
        uint256 circleId;
        /// @notice Address that called `createGoal`.
        address creator;
        /// @notice Binary/Multi/Numeric — see OutcomeType.
        OutcomeType outcomeType;
        /// @notice Current lifecycle state.
        GoalStatus status;
        /// @notice Unix timestamp after which staking closes.
        uint64 deadline;
        /// @notice Minimum USDT per stake (6-decimal base units).
        uint128 minStake;
        /// @notice Sum of all stakes across both sides.
        uint128 totalPool;
        /// @notice Winning side, or UNRESOLVED (255) until resolution finalizes.
        uint8 winningSide;
        /// @notice Off-chain metadata JSON (question text + tags).
        string metadataURI;
    }

    /// @notice Emitted by `createGoal`. Full goal config in one event so
    ///         indexers don't need a separate read to backfill metadata.
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
    /// @notice Emitted by `stake`. Reports the user's PER-CALL stake;
    ///         off-chain totals come from summing all Staked events for
    ///         a given (goalId, user, side).
    event Staked(uint256 indexed goalId, address indexed user, uint8 side, uint256 amount);
    /// @notice Emitted by `lockGoal` when goal transitions Open → Locked.
    event GoalLocked(uint256 indexed goalId);
    /// @notice Emitted by `setWinner` when goal transitions to PaidOut.
    /// @dev `winningSide` matches the resolver's choice. UNRESOLVED (255)
    ///      will never appear in this event — resolved goals always have
    ///      a real side.
    event GoalResolved(uint256 indexed goalId, uint8 winningSide);
    /// @notice Emitted the FIRST time `refund` is called on a disputed
    ///         goal — subsequent refunds by other stakers don't re-emit.
    event GoalRefunded(uint256 indexed goalId);
    /// @notice Emitted on each successful `claim`. `amount` is post-fee.
    event Claimed(uint256 indexed goalId, address indexed user, uint256 amount);
    /// @notice Heartbeat event — fires once per `settlement()` call.
    /// @dev `timestamp` is `block.timestamp` at the moment of emission.
    ///      Indexed so off-chain consumers can filter logs by a
    ///      specific block-time without scanning every event.
    event Settlement(uint256 indexed timestamp);

    /// @notice Create a new goal inside a circle.
    /// @dev Caller MUST be a circle member; all resolvers MUST too.
    ///      `deadline` MUST be > now + 1 hour. resolverList capped at 32.
    /// @return goalId Sequential id of the new goal.
    function createGoal(
        uint256 circleId,
        OutcomeType outcomeType,
        uint64 deadline,
        uint128 minStake,
        address[] calldata resolverList,
        string calldata metadataURI
    ) external returns (uint256 goalId);

    /// @notice Stake USDT on a side. Caller MUST have approved USDT to this contract.
    /// @dev One-side-per-user invariant: switching sides reverts CannotSwitchSides.
    /// @param side 0 = NO, 1 = YES.
    /// @param amount USDT base units (6-decimal).
    function stake(uint256 goalId, uint8 side, uint256 amount) external;

    /// @notice Permissionless lock: anyone can transition Open → Locked after deadline.
    function lockGoal(uint256 goalId) external;

    /// @notice Claim winner's payout. Caller MUST be on the winning side.
    /// @dev Payout = winnerStake + winnerStake * losersPool / winnersPool - fee.
    function claim(uint256 goalId) external;

    /// @notice Reclaim principal from a disputed goal (tied resolver vote).
    function refund(uint256 goalId) external;
    /// @notice Admin: wire the ResolutionModule address (post-deploy hook).
    function setResolutionModule(address m) external;

    /// @notice FEE_SETTER_ROLE: set protocol fee bps (capped at 1000 = 10%) + recipient.
    function setFee(uint256 bps, address recipient) external;

    /// @notice PAUSER_ROLE: emergency stop on `createGoal` + `stake` only.
    ///         Existing locked positions still flow to resolution + payout.
    function pause() external;

    /// @notice PAUSER_ROLE: release the emergency stop.
    function unpause() external;

    /// @notice ResolutionModule callback: set winning side + mark PaidOut.
    /// @dev OnlyResolution-gated; anyone else reverts OnlyResolution.
    function setWinner(uint256 goalId, uint8 winningSide) external;

    /// @notice ResolutionModule callback: mark goal Disputed (tied vote).
    function markDisputed(uint256 goalId) external;

    /// @notice Read — true if `user` is on the goal's resolver list.
    function isResolver(uint256 goalId, address user) external view returns (bool);

    /// @notice Read — number of resolvers registered for a goal.
    /// @dev Stable for the goal's lifetime (no add/remove API).
    function getResolverCount(uint256 goalId) external view returns (uint256);
}
