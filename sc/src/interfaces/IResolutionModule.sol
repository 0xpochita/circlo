// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IResolutionModule {
    event VoteSubmitted(uint256 indexed goalId, address indexed resolver, uint8 choice);
    event GoalFinalized(uint256 indexed goalId, uint8 winningChoice);
    event GoalDisputed(uint256 indexed goalId);

    function submitVote(uint256 goalId, uint8 choice) external;
    function finalize(uint256 goalId) external;
    function startVote(uint256 goalId) external;
    function isResolver(uint256 goalId, address user) external view returns (bool);
    function getTally(uint256 goalId) external view returns (uint256[] memory counts, uint256 total);
}
