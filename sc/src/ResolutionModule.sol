// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IResolutionModule.sol";
import "./interfaces/IPredictionPool.sol";

/// @title ResolutionModule
/// @notice On-chain resolver voting + tally finalization for Circlo goals.
/// @dev UUPS upgradeable. Owned by the same admin as PredictionPool, but
///      vote storage + finalization logic live here so the pool stays
///      focused on stake/claim mechanics. Designed to be paired 1:1 with
///      a PredictionPool instance via `setPool`.
contract ResolutionModule is Initializable, AccessControlUpgradeable, UUPSUpgradeable, IResolutionModule {
    /// @notice Role allowed to authorize UUPS upgrades of this contract.
    /// @dev Granted via AccessControl; check before any `_authorizeUpgrade` call.
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @notice Snapshot of a single resolver's vote on a goal.
    struct Vote {
        /// @notice Side picked by the resolver: 0 = NO, 1 = YES.
        uint8 choice;
        /// @notice Set to true after the resolver casts their vote.
        bool voted;
    }

    /// @notice Aggregate per-goal vote bookkeeping.
    /// @dev `resolverCount` is captured at `startVote` so quorum stays
    ///      stable even if the resolver list changes later.
    struct Tally {
        /// @notice Per-choice vote count (countPerChoice[0] = NO, [1] = YES).
        mapping(uint8 => uint256) countPerChoice;
        /// @notice Sum of all per-choice counts.
        uint256 totalVotes;
        /// @notice Number of eligible resolvers at vote start.
        uint256 resolverCount;
        /// @notice True after `_finalize` runs — prevents re-entry.
        bool finalized;
        /// @notice Block timestamp when `startVote` was called.
        uint64 voteStartTime;
    }

    /// @notice goalId → tally. Internal because mapping with nested
    ///         mappings cannot be public.
    mapping(uint256 => Tally) internal tallies;
    /// @notice goalId → resolver → their cast Vote.
    mapping(uint256 => mapping(address => Vote)) public votes;

    /// @notice Paired PredictionPool instance — source of resolver list +
    ///         destination for `setWinner`/`markDisputed` callbacks.
    IPredictionPool public pool;
    /// @notice Numerator of the quorum fraction (e.g. 51 for 51%).
    uint256 public quorumNumerator;
    /// @notice Denominator of the quorum fraction (e.g. 100 for 51%).
    uint256 public quorumDenominator;
    /// @notice Seconds after `startVote` during which votes are accepted.
    uint256 public voteWindow;

    /// @notice Thrown when a non-pool address calls a pool-only function.
    error OnlyPool();
    /// @notice Thrown when an action is attempted on an already-finalized goal.
    error AlreadyFinalized();
    /// @notice Thrown when a resolver tries to vote twice on the same goal.
    error AlreadyVoted();
    /// @notice Thrown when a non-resolver address tries to vote.
    error NotResolver();
    /// @notice Thrown when a vote is submitted after the vote window expires.
    error VoteWindowExpired();
    /// @notice Thrown when `finalize` is called before quorum/window allows it.
    error CannotFinalizeYet();
    /// @notice Thrown when calling pool-dependent methods before `setPool`.
    error PoolNotSet();

    constructor() {
        _disableInitializers();
    }

    /// @notice One-shot initializer for the UUPS proxy.
    /// @dev MUST be called once immediately after proxy deployment. The
    ///      `_disableInitializers()` in the constructor prevents calling
    ///      this on the implementation contract directly.
    /// @param admin Address granted DEFAULT_ADMIN_ROLE (controls `setPool` + role grants).
    /// @param _quorumNumerator Quorum fraction numerator (e.g. 51).
    /// @param _quorumDenominator Quorum fraction denominator (e.g. 100).
    /// @param _voteWindow Seconds after startVote during which votes are accepted.
    function initialize(
        address admin,
        uint256 _quorumNumerator,
        uint256 _quorumDenominator,
        uint256 _voteWindow
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        quorumNumerator   = _quorumNumerator;
        quorumDenominator = _quorumDenominator;
        voteWindow        = _voteWindow;
    }

    /// @notice Wire this ResolutionModule to a PredictionPool instance.
    /// @dev Admin-only. Must be called once after both proxies are deployed
    ///      and before any vote can be started — `startVote` reads
    ///      `pool.getResolverCount` for quorum sizing.
    /// @param _pool Deployed PredictionPool proxy address.
    function setPool(address _pool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        pool = IPredictionPool(_pool);
    }

    /// @notice Open the vote window for a goal.
    /// @dev Callable only by the configured PredictionPool, which calls
    ///      this when transitioning a goal to Locked status. Captures the
    ///      current resolver count so subsequent quorum math is stable
    ///      even if the pool's resolver list mutates.
    /// @param goalId Goal whose vote window is being opened.
    function startVote(uint256 goalId) external {
        if (address(pool) == address(0)) revert PoolNotSet();
        if (msg.sender != address(pool)) revert OnlyPool();
        Tally storage t = tallies[goalId];
        t.voteStartTime  = uint64(block.timestamp);
        t.resolverCount  = pool.getResolverCount(goalId);
    }

    /// @notice Cast a vote on a locked goal.
    /// @dev Auto-finalizes when the running tally crosses quorum, saving a
    ///      separate `finalize` call in the common case. Reverts when:
    ///        - the goal is already finalized (AlreadyFinalized)
    ///        - the resolver already voted on this goal (AlreadyVoted)
    ///        - caller is not on the goal's resolver list (NotResolver)
    ///        - vote window has elapsed (VoteWindowExpired)
    /// @param goalId Goal to vote on.
    /// @param choice 0 = NO, 1 = YES. Choice value is stored verbatim;
    ///        outcomeType decoding lives in PredictionPool.
    function submitVote(uint256 goalId, uint8 choice) external {
        Tally storage t = tallies[goalId];
        if (t.finalized) revert AlreadyFinalized();
        if (votes[goalId][msg.sender].voted) revert AlreadyVoted();
        if (!pool.isResolver(goalId, msg.sender)) revert NotResolver();
        if (block.timestamp > t.voteStartTime + voteWindow) revert VoteWindowExpired();

        votes[goalId][msg.sender] = Vote({ choice: choice, voted: true });
        t.countPerChoice[choice]++;
        t.totalVotes++;

        emit VoteSubmitted(goalId, msg.sender, choice);

        uint256 quorum = (t.resolverCount * quorumNumerator) / quorumDenominator;
        if (quorum == 0) quorum = 1;
        if (t.totalVotes >= quorum) {
            _finalize(goalId);
        }
    }

    /// @notice Force-finalize a goal whose tally hasn't auto-finalized.
    /// @dev Permissionless on purpose — anyone can poke a stale vote
    ///      window past the line. Reverts with CannotFinalizeYet unless
    ///      EITHER quorum has been reached OR the vote window has fully
    ///      elapsed; this prevents premature finalization but allows
    ///      cleanup of dead goals.
    ///
    ///      Outcome split inside `_finalize`:
    ///        - tie (count0 == count1) → markDisputed on pool
    ///        - else → setWinner(side with more votes) on pool
    /// @param goalId Goal to finalize.
    function finalize(uint256 goalId) external {
        Tally storage t = tallies[goalId];
        if (t.finalized) revert AlreadyFinalized();

        uint256 quorum = (t.resolverCount * quorumNumerator) / quorumDenominator;
        if (quorum == 0) quorum = 1;

        bool quorumReached  = t.totalVotes >= quorum;
        bool windowExpired  = block.timestamp > t.voteStartTime + voteWindow;

        if (!quorumReached && !windowExpired) revert CannotFinalizeYet();

        _finalize(goalId);
    }

    /// @notice Convenience read — true if `user` is a resolver for `goalId`.
    /// @dev Delegates to PredictionPool.isResolver. Exposed here so UIs that
    ///      only know the ResolutionModule address don't need to also know
    ///      the pool address to gate vote buttons.
    /// @param goalId Goal to check.
    /// @param user Address to test for resolver membership.
    /// @return True if `user` is on the goal's resolver list.
    function isResolver(uint256 goalId, address user) external view returns (bool) {
        return pool.isResolver(goalId, user);
    }

    /// @notice Read the current vote distribution for a goal.
    /// @dev Returns a fixed-length 2-element array because the only
    ///      outcomes Circlo supports today are binary YES/NO. If multi-
    ///      choice outcomes are added later, this signature changes.
    /// @param goalId Goal to read tally for.
    /// @return counts Length-2 array: counts[0] = NO votes, counts[1] = YES.
    /// @return total Sum of both counts (always counts[0] + counts[1]).
    function getTally(uint256 goalId) external view returns (uint256[] memory counts, uint256 total) {
        Tally storage t = tallies[goalId];
        counts = new uint256[](2);
        counts[0] = t.countPerChoice[0];
        counts[1] = t.countPerChoice[1];
        total = t.totalVotes;
    }

    function _finalize(uint256 goalId) internal {
        Tally storage t = tallies[goalId];
        t.finalized = true;

        uint256 count0 = t.countPerChoice[0];
        uint256 count1 = t.countPerChoice[1];

        if (count0 == count1) {
            pool.markDisputed(goalId);
            emit GoalDisputed(goalId);
        } else {
            uint8 winner = count1 > count0 ? 1 : 0;
            pool.setWinner(goalId, winner);
            emit GoalFinalized(goalId, winner);
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
