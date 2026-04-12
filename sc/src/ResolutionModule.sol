// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IResolutionModule.sol";
import "./interfaces/IPredictionPool.sol";

contract ResolutionModule is Initializable, AccessControlUpgradeable, UUPSUpgradeable, IResolutionModule {
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    struct Vote {
        uint8 choice;
        bool voted;
    }

    struct Tally {
        mapping(uint8 => uint256) countPerChoice;
        uint256 totalVotes;
        uint256 resolverCount;
        bool finalized;
        uint64 voteStartTime;
    }

    mapping(uint256 => Tally) internal tallies;
    mapping(uint256 => mapping(address => Vote)) public votes;

    IPredictionPool public pool;
    uint256 public quorumNumerator;
    uint256 public quorumDenominator;
    uint256 public voteWindow;

    error OnlyPool();
    error AlreadyFinalized();
    error AlreadyVoted();
    error NotResolver();
    error VoteWindowExpired();
    error CannotFinalizeYet();
    error PoolNotSet();

    constructor() {
        _disableInitializers();
    }

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

    function setPool(address _pool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        pool = IPredictionPool(_pool);
    }

    function startVote(uint256 goalId) external {
        if (address(pool) == address(0)) revert PoolNotSet();
        if (msg.sender != address(pool)) revert OnlyPool();
        Tally storage t = tallies[goalId];
        t.voteStartTime  = uint64(block.timestamp);
        t.resolverCount  = pool.getResolverCount(goalId);
    }

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

    function isResolver(uint256 goalId, address user) external view returns (bool) {
        return pool.isResolver(goalId, user);
    }

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
