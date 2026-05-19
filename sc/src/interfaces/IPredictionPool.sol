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

    function createGoal(
        uint256 circleId,
        OutcomeType outcomeType,
        uint64 deadline,
        uint128 minStake,
        address[] calldata resolverList,
        string calldata metadataURI
    ) external returns (uint256 goalId);

    function stake(uint256 goalId, uint8 side, uint256 amount) external;
    function lockGoal(uint256 goalId) external;
    function claim(uint256 goalId) external;
    function refund(uint256 goalId) external;
    function setResolutionModule(address m) external;
    function setFee(uint256 bps, address recipient) external;
    function pause() external;
    function unpause() external;
    function setWinner(uint256 goalId, uint8 winningSide) external;
    function markDisputed(uint256 goalId) external;
    function isResolver(uint256 goalId, address user) external view returns (bool);
    function getResolverCount(uint256 goalId) external view returns (uint256);
}
