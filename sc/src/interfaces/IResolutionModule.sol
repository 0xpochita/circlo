// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IResolutionModule
/// @notice External interface for ResolutionModule — receives resolver
///         votes for goals, tallies them, and calls back into
///         PredictionPool with the outcome (setWinner / markDisputed).
/// @dev Paired 1:1 with a PredictionPool instance via that pool's
///      `setResolutionModule(address)`. All vote bookkeeping lives here;
///      PredictionPool stays focused on stake/claim mechanics.
interface IResolutionModule {
    /// @notice Emitted on each `submitVote` call.
    /// @dev `choice` is 0 (NO) or 1 (YES); future multi-outcome support
    ///      would use higher values within the same uint8 space.
    event VoteSubmitted(uint256 indexed goalId, address indexed resolver, uint8 choice);

    /// @notice Emitted when the tally finalizes with a clear winner.
    /// @dev `winningChoice` matches the side that crossed quorum.
    event GoalFinalized(uint256 indexed goalId, uint8 winningChoice);

    /// @notice Emitted when the tally finalizes tied — goal goes to refund mode.
    event GoalDisputed(uint256 indexed goalId);

    function submitVote(uint256 goalId, uint8 choice) external;
    function finalize(uint256 goalId) external;
    function startVote(uint256 goalId) external;
    function isResolver(uint256 goalId, address user) external view returns (bool);
    function getTally(uint256 goalId) external view returns (uint256[] memory counts, uint256 total);
}
