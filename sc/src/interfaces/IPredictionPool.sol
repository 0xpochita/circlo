// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPredictionPool {
    enum OutcomeType { Binary, Multi, Numeric }
    enum GoalStatus { Open, Locked, Resolving, Resolved, Disputed, PaidOut }

    struct Goal {
        uint256 circleId;
        address creator;
        OutcomeType outcomeType;
        GoalStatus status;
        uint64 deadline;
        uint128 minStake;
        uint128 totalPool;
        uint8 winningSide;
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
