// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IPredictionPool.sol";
import "./interfaces/ICircleFactory.sol";
import "./interfaces/IResolutionModule.sol";

contract PredictionPool is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IPredictionPool
{
    using SafeERC20 for IERC20;

    bytes32 public constant PAUSER_ROLE    = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE  = keccak256("UPGRADER_ROLE");
    bytes32 public constant FEE_SETTER_ROLE = keccak256("FEE_SETTER_ROLE");

    uint64  public constant MIN_GOAL_DURATION = 1 hours;
    uint256 public constant MAX_RESOLVERS     = 32;

    uint8 public constant UNRESOLVED = 255;

    mapping(uint256 => Goal) public goals;
    mapping(uint256 => mapping(uint8 => uint256)) public poolPerSide;
    mapping(uint256 => mapping(address => mapping(uint8 => uint256))) public stakeOf;
    mapping(uint256 => address[]) internal _resolvers;
    mapping(uint256 => mapping(address => bool)) public isResolver;
    mapping(uint256 => mapping(address => bool)) internal _claimed;
    mapping(uint256 => bool) internal _refundEmitted;

    IERC20             public USDT;
    ICircleFactory     public factory;
    IResolutionModule  public resolution;

    uint256 public nextGoalId;
    uint256 public protocolFeeBps;
    address public feeRecipient;

    error NotCircleMember();
    error DeadlineTooSoon();
    error NoResolvers();
    error TooManyResolvers();
    error ResolverNotMember();
    error GoalNotOpen();
    error GoalNotLocked();
    error GoalNotResolving();
    error GoalNotPaidOut();
    error GoalNotDisputed();
    error DeadlineNotPassed();
    error DeadlinePassed();
    error BelowMinStake();
    error CannotSwitchSides();
    error NothingToClaim();
    error AlreadyClaimed();
    error OnlyResolution();
    error FeeTooHigh();
    error ZeroAddress();

    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _usdt,
        address _factory,
        address _resolution,
        address admin
    ) external initializer {
        if (_usdt == address(0) || _factory == address(0)) revert ZeroAddress();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        USDT       = IERC20(_usdt);
        factory    = ICircleFactory(_factory);
        resolution = IResolutionModule(_resolution);
        protocolFeeBps = 0;
    }

    function createGoal(
        uint256 circleId,
        OutcomeType outcomeType,
        uint64 deadline,
        uint128 minStake,
        address[] calldata resolverList,
        string calldata metadataURI
    ) external whenNotPaused returns (uint256 goalId) {
        if (!factory.isCircleMember(circleId, msg.sender)) revert NotCircleMember();
        if (deadline <= block.timestamp + MIN_GOAL_DURATION) revert DeadlineTooSoon();
        if (resolverList.length == 0) revert NoResolvers();
        if (resolverList.length > MAX_RESOLVERS) revert TooManyResolvers();

        for (uint256 i = 0; i < resolverList.length; i++) {
            if (!factory.isCircleMember(circleId, resolverList[i])) revert ResolverNotMember();
        }

        goalId = nextGoalId++;
        goals[goalId] = Goal({
            circleId:    circleId,
            creator:     msg.sender,
            outcomeType: outcomeType,
            status:      GoalStatus.Open,
            deadline:    deadline,
            minStake:    minStake,
            totalPool:   0,
            winningSide: UNRESOLVED,
            metadataURI: metadataURI
        });

        for (uint256 i = 0; i < resolverList.length; i++) {
            _resolvers[goalId].push(resolverList[i]);
            isResolver[goalId][resolverList[i]] = true;
        }

        emit GoalCreated(goalId, circleId, msg.sender, uint8(outcomeType), deadline, minStake, resolverList, metadataURI);
    }

    function stake(uint256 goalId, uint8 side, uint256 amount)
        external
        whenNotPaused
        nonReentrant
    {
        Goal storage g = goals[goalId];
        if (!factory.isCircleMember(g.circleId, msg.sender)) revert NotCircleMember();
        if (g.status != GoalStatus.Open) revert GoalNotOpen();
        if (block.timestamp >= g.deadline) revert DeadlinePassed();
        if (amount < g.minStake) revert BelowMinStake();
        if (stakeOf[goalId][msg.sender][1 - side] > 0) revert CannotSwitchSides();

        stakeOf[goalId][msg.sender][side] += amount;
        poolPerSide[goalId][side]         += amount;
        g.totalPool                       += uint128(amount);

        USDT.safeTransferFrom(msg.sender, address(this), amount);

        emit Staked(goalId, msg.sender, side, amount);
    }

    function lockGoal(uint256 goalId) external {
        Goal storage g = goals[goalId];
        if (g.status != GoalStatus.Open) revert GoalNotOpen();
        if (block.timestamp < g.deadline) revert DeadlineNotPassed();

        g.status = GoalStatus.Locked;
        emit GoalLocked(goalId);

        resolution.startVote(goalId);
        g.status = GoalStatus.Resolving;
    }

    function claim(uint256 goalId) external nonReentrant {
        Goal storage g = goals[goalId];
        if (g.status != GoalStatus.PaidOut) revert GoalNotPaidOut();
        if (_claimed[goalId][msg.sender]) revert AlreadyClaimed();

        uint8 winningSide = g.winningSide;
        uint256 winningPool = poolPerSide[goalId][winningSide];

        uint256 payout;

        if (winningPool == 0) {
            uint8 losingSide = 1 - winningSide;
            uint256 userLosingStake = stakeOf[goalId][msg.sender][losingSide];
            if (userLosingStake == 0) revert NothingToClaim();
            payout = userLosingStake;
        } else {
            uint256 userStake = stakeOf[goalId][msg.sender][winningSide];
            if (userStake == 0) revert NothingToClaim();
            uint256 losingPool = poolPerSide[goalId][1 - winningSide];
            payout = userStake + (userStake * losingPool) / winningPool;
        }

        if (protocolFeeBps > 0) {
            uint256 fee = (payout * protocolFeeBps) / 10_000;
            payout -= fee;
            USDT.safeTransfer(feeRecipient, fee);
        }

        _claimed[goalId][msg.sender] = true;

        USDT.safeTransfer(msg.sender, payout);

        emit Claimed(goalId, msg.sender, payout);
    }

    function refund(uint256 goalId) external nonReentrant {
        Goal storage g = goals[goalId];
        if (g.status != GoalStatus.Disputed) revert GoalNotDisputed();
        if (_claimed[goalId][msg.sender]) revert AlreadyClaimed();

        uint256 total = stakeOf[goalId][msg.sender][0] + stakeOf[goalId][msg.sender][1];
        if (total == 0) revert NothingToClaim();

        _claimed[goalId][msg.sender] = true;

        if (!_refundEmitted[goalId]) {
            _refundEmitted[goalId] = true;
            emit GoalRefunded(goalId);
        }

        USDT.safeTransfer(msg.sender, total);
    }

    function setWinner(uint256 goalId, uint8 winningSide) external {
        if (msg.sender != address(resolution)) revert OnlyResolution();
        Goal storage g = goals[goalId];
        require(
            g.status == GoalStatus.Resolving || g.status == GoalStatus.Locked,
            "bad status"
        );
        g.winningSide = winningSide;
        g.status = GoalStatus.Resolved;
        emit GoalResolved(goalId, winningSide);
        g.status = GoalStatus.PaidOut;
    }

    function markDisputed(uint256 goalId) external {
        if (msg.sender != address(resolution)) revert OnlyResolution();
        Goal storage g = goals[goalId];
        require(
            g.status == GoalStatus.Resolving || g.status == GoalStatus.Locked,
            "bad status"
        );
        g.status = GoalStatus.Disputed;
    }

    function getResolverCount(uint256 goalId) external view returns (uint256) {
        return _resolvers[goalId].length;
    }

    function setResolutionModule(address m) external onlyRole(DEFAULT_ADMIN_ROLE) {
        resolution = IResolutionModule(m);
    }

    function setFee(uint256 bps, address recipient) external onlyRole(FEE_SETTER_ROLE) {
        if (bps > 1000) revert FeeTooHigh();
        protocolFeeBps = bps;
        feeRecipient   = recipient;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
