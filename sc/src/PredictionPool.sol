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

/// @title PredictionPool
/// @notice Core escrow + lifecycle contract for Circlo prediction goals.
///         Holds USDT stakes, transitions goals through Open → Locked →
///         Resolving → PaidOut/Refunded, and pays winners proportionally.
/// @dev UUPS upgradeable. Pausable (`PAUSER_ROLE` can halt new stakes +
///      claims without breaking already-locked positions).
///      ReentrancyGuard wraps the two USDT-transfer paths (`claim`,
///      `refund`).
///
///      Companion contracts:
///        - CircleFactory: membership source of truth (gated by `isCircleMember`)
///        - ResolutionModule: vote tally — calls back via `setWinner` /
///          `markDisputed` after finalization
contract PredictionPool is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    PausableUpgradeable,
    ReentrancyGuardUpgradeable,
    IPredictionPool
{
    using SafeERC20 for IERC20;

    /// @notice Role allowed to call `pause()` / `unpause()` — emergency stop.
    bytes32 public constant PAUSER_ROLE    = keccak256("PAUSER_ROLE");
    /// @notice Role allowed to authorize UUPS upgrades.
    bytes32 public constant UPGRADER_ROLE  = keccak256("UPGRADER_ROLE");
    /// @notice Role allowed to call `setFee` — adjusts protocol fee bps.
    bytes32 public constant FEE_SETTER_ROLE = keccak256("FEE_SETTER_ROLE");

    /// @notice Minimum allowed time between `block.timestamp` and `deadline`
    ///         at goal-creation time. Goals must run for AT LEAST 1 hour
    ///         to prevent flash-create-and-resolve attacks.
    uint64  public constant MIN_GOAL_DURATION = 1 hours;
    /// @notice Hard cap on resolver list size per goal — protects gas on
    ///         iteration paths (vote tally, etc).
    uint256 public constant MAX_RESOLVERS     = 32;

    /// @notice Sentinel for the `winningSide` field while a goal is unresolved.
    ///         Match against this (rather than 0) to distinguish "no winner
    ///         yet" from "NO won".
    uint8 public constant UNRESOLVED = 255;

    /// @notice goalId → Goal struct (circleId, creator, outcomeType, status,
    ///         deadline, minStake, totalPool, winningSide, metadataURI).
    mapping(uint256 => Goal) public goals;
    /// @notice goalId → side → total USDT pooled on that side.
    ///         Used for payout proportion math at claim time.
    mapping(uint256 => mapping(uint8 => uint256)) public poolPerSide;
    /// @notice goalId → user → side → user's stake on that side.
    ///         Tri-level mapping so a user can stake on both sides if
    ///         they choose (though most front-ends gate this with
    ///         CannotSwitchSides at the contract level — see `stake`).
    mapping(uint256 => mapping(address => mapping(uint8 => uint256))) public stakeOf;
    /// @notice goalId → resolver list. Internal; iteration via
    ///         getResolverCount + isResolver checks.
    mapping(uint256 => address[]) internal _resolvers;
    /// @notice goalId → address → is-resolver flag. Public so UIs can
    ///         gate vote buttons without a dedicated read function.
    mapping(uint256 => mapping(address => bool)) public isResolver;
    /// @notice goalId → user → has-claimed flag. Internal to prevent
    ///         double-claim; exposed indirectly via `claim` revert.
    mapping(uint256 => mapping(address => bool)) internal _claimed;
    /// @notice goalId → bool. Tracks whether a refund event has been
    ///         emitted (so a 2nd refund call doesn't double-emit).
    mapping(uint256 => bool) internal _refundEmitted;

    /// @notice The USDT (or ERC20) token used for all stakes + payouts.
    IERC20             public USDT;
    /// @notice CircleFactory address — source of truth for circle
    ///         membership (gates createGoal + stake).
    ICircleFactory     public factory;
    /// @notice ResolutionModule address — receives `startVote` calls at
    ///         lock time, calls back via `setWinner` / `markDisputed`.
    IResolutionModule  public resolution;

    /// @notice Next id to assign on `createGoal`. Monotonically increasing.
    uint256 public nextGoalId;
    /// @notice Protocol fee in basis points (10000 = 100%). Default 0.
    ///         Capped at 1000 (10%) by `setFee`.
    uint256 public protocolFeeBps;
    /// @notice Address that receives the protocol fee on each claim.
    address public feeRecipient;

    /// @notice Caller isn't a member of the goal's circle (createGoal/stake).
    error NotCircleMember();
    /// @notice Goal deadline <= now + MIN_GOAL_DURATION (createGoal).
    error DeadlineTooSoon();
    /// @notice Empty resolverList passed (createGoal).
    error NoResolvers();
    /// @notice resolverList exceeds MAX_RESOLVERS (createGoal).
    error TooManyResolvers();
    /// @notice One of the resolvers isn't a member of the circle (createGoal).
    error ResolverNotMember();
    /// @notice Action requires goal in Open status (stake/lockGoal).
    error GoalNotOpen();
    /// @notice Action requires goal in Locked status.
    error GoalNotLocked();
    /// @notice Action requires goal in Resolving status (setWinner/markDisputed).
    error GoalNotResolving();
    /// @notice Action requires goal in PaidOut status (claim).
    error GoalNotPaidOut();
    /// @notice Action requires goal in Disputed status (refund).
    error GoalNotDisputed();
    /// @notice lockGoal called before deadline elapsed.
    error DeadlineNotPassed();
    /// @notice stake called after deadline elapsed.
    error DeadlinePassed();
    /// @notice Stake amount below the goal's minStake.
    error BelowMinStake();
    /// @notice User already staked on the OTHER side of this goal.
    error CannotSwitchSides();
    /// @notice claim returned a zero payout (user on losing side, or never staked).
    error NothingToClaim();
    /// @notice User has already claimed (or refunded) on this goal.
    error AlreadyClaimed();
    /// @notice setWinner/markDisputed called by a non-ResolutionModule address.
    error OnlyResolution();
    /// @notice setFee bps exceeds the 1000 (10%) hard cap.
    error FeeTooHigh();
    /// @notice Zero address passed where a real address is required (initialize).
    error ZeroAddress();

    constructor() {
        _disableInitializers();
    }

    /// @notice One-shot initializer for the UUPS proxy.
    /// @dev Wires all four collaborator addresses + admin role. Note that
    ///      `_resolution` is allowed to be zero at init time — the
    ///      ResolutionModule proxy is typically deployed AFTER this one,
    ///      so `setResolutionModule` is the post-deploy hook. USDT +
    ///      factory MUST be set up-front (revert ZeroAddress otherwise).
    ///
    ///      protocolFeeBps initialized to 0 — no fee at launch; admin
    ///      can adjust via setFee.
    /// @param _usdt ERC20 used for all stakes + payouts.
    /// @param _factory CircleFactory address — membership source of truth.
    /// @param _resolution ResolutionModule address (can be address(0); set later).
    /// @param admin Address granted DEFAULT_ADMIN_ROLE.
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

    /// @notice Create a new prediction goal inside a circle.
    /// @dev Caller MUST be a member of the circle. Validates four things:
    ///        1. msg.sender ∈ circleMembers (NotCircleMember)
    ///        2. deadline > now + MIN_GOAL_DURATION (DeadlineTooSoon)
    ///        3. resolverList non-empty (NoResolvers)
    ///        4. resolverList.length <= MAX_RESOLVERS (TooManyResolvers)
    ///        5. every resolver is also a circle member (ResolverNotMember)
    ///
    ///      Pausable — blocked when contract is paused.
    /// @param circleId Circle this goal belongs to.
    /// @param outcomeType OutcomeType enum value (Binary today; reserved for future).
    /// @param deadline Unix timestamp after which staking closes.
    /// @param minStake Minimum USDT amount per stake (6-decimal base units).
    /// @param resolverList Addresses allowed to vote on resolution.
    /// @param metadataURI Off-chain JSON metadata (question, description).
    /// @return goalId Sequential id assigned to the new goal.
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

    /// @notice Stake USDT on a side of a goal.
    /// @dev Caller MUST be a circle member + the goal MUST be Open +
    ///      pre-deadline. Enforces:
    ///        - one-side-per-user: revert CannotSwitchSides if user
    ///          already has a stake on the OTHER side
    ///        - minimum stake size (BelowMinStake)
    ///        - safe ERC20 pull (caller MUST have approved this contract)
    ///
    ///      Pausable + nonReentrant. The nonReentrant guard matters
    ///      because the ERC20 transfer COULD reenter if the token is
    ///      malicious — defensive default.
    /// @param goalId Goal to stake on.
    /// @param side 0 = NO, 1 = YES.
    /// @param amount USDT to stake (6-decimal base units).
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

    /// @notice Transition a goal from Open to Locked + open the vote window.
    /// @dev Permissionless — anyone can poke this once the deadline elapses.
    ///      Calls into ResolutionModule.startVote which captures the
    ///      current resolver count for quorum sizing.
    ///
    ///      Reverts:
    ///        - GoalNotOpen if goal is already locked/resolved/etc
    ///        - DeadlineNotPassed if called before deadline
    /// @param goalId Goal to lock.
    function lockGoal(uint256 goalId) external {
        Goal storage g = goals[goalId];
        if (g.status != GoalStatus.Open) revert GoalNotOpen();
        if (block.timestamp < g.deadline) revert DeadlineNotPassed();

        g.status = GoalStatus.Locked;
        emit GoalLocked(goalId);

        resolution.startVote(goalId);
        g.status = GoalStatus.Resolving;
    }

    /// @notice Claim a winner's payout for a resolved goal.
    /// @dev Caller MUST be on the winning side. Payout formula:
    ///
    ///        winnerStake = stakeOf[goalId][msg.sender][winningSide]
    ///        losersPool  = poolPerSide[goalId][losingSide]
    ///        winnersPool = poolPerSide[goalId][winningSide]
    ///        gross       = winnerStake + winnerStake * losersPool / winnersPool
    ///        fee         = gross * protocolFeeBps / 10000
    ///        payout      = gross - fee
    ///
    ///      Fee (if any) is transferred to feeRecipient; remainder to caller.
    ///      nonReentrant + flag-then-transfer ordering — even with a
    ///      malicious USDT, a re-entrant claim would hit AlreadyClaimed.
    ///
    ///      Reverts:
    ///        - GoalNotPaidOut if goal isn't in PaidOut status
    ///        - AlreadyClaimed if caller already claimed
    ///        - NothingToClaim if caller had zero on winning side
    /// @param goalId Goal to claim from.
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

    /// @notice Recover original stake from a disputed goal.
    /// @dev Used when ResolutionModule marks a goal Disputed (tied vote).
    ///      Returns the caller's stake on BOTH sides — no fee, no payout
    ///      math, just the original principal back. Sets _claimed flag
    ///      to prevent double-refund.
    ///
    ///      First refund call also emits the GoalRefunded event
    ///      (gated by _refundEmitted bool — subsequent refund calls by
    ///      other stakers don't re-emit).
    ///
    ///      Reverts:
    ///        - GoalNotDisputed if goal isn't in Disputed status
    ///        - AlreadyClaimed if caller already refunded
    ///        - NothingToClaim if caller had zero stake
    /// @param goalId Goal to refund from.
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

    /// @notice ResolutionModule callback: set the winning side + mark PaidOut.
    /// @dev OnlyResolution — anyone else reverts with OnlyResolution.
    ///      Called by ResolutionModule._finalize when a clear winner
    ///      emerges from the resolver vote.
    ///
    ///      Reverts:
    ///        - GoalNotResolving if goal isn't in Locked/Resolving status
    ///        - OnlyResolution if caller != configured ResolutionModule
    /// @param goalId Goal being resolved.
    /// @param winningSide 0 = NO won, 1 = YES won.
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

    /// @notice ResolutionModule callback: mark a goal Disputed (tied vote).
    /// @dev OnlyResolution. Called by ResolutionModule._finalize when the
    ///      resolver tally ends in a tie. After this, stakers can call
    ///      `refund` to recover principal.
    ///
    ///      Reverts:
    ///        - GoalNotResolving if goal isn't in Locked/Resolving status
    ///        - OnlyResolution if caller != configured ResolutionModule
    /// @param goalId Goal being marked disputed.
    function markDisputed(uint256 goalId) external {
        if (msg.sender != address(resolution)) revert OnlyResolution();
        Goal storage g = goals[goalId];
        require(
            g.status == GoalStatus.Resolving || g.status == GoalStatus.Locked,
            "bad status"
        );
        g.status = GoalStatus.Disputed;
    }

    /// @notice Read the number of resolvers registered for a goal.
    /// @dev Used by ResolutionModule.startVote to size the quorum threshold.
    ///      Stable for the lifetime of the goal (no add/remove API), so
    ///      ResolutionModule can safely cache the value.
    /// @param goalId Goal to query.
    /// @return The resolver count, never zero (createGoal reverts NoResolvers).
    function getResolverCount(uint256 goalId) external view returns (uint256) {
        return _resolvers[goalId].length;
    }

    /// @notice Admin: wire the ResolutionModule address post-deploy.
    /// @dev Admin-only. Pairs with the asymmetric initialize zero-check
    ///      — _resolution can be address(0) at init time, so this is the
    ///      post-deploy hook. Re-calling overwrites the binding; admin
    ///      should be careful not to swap mid-flight.
    /// @param m Deployed ResolutionModule proxy address.
    function setResolutionModule(address m) external onlyRole(DEFAULT_ADMIN_ROLE) {
        resolution = IResolutionModule(m);
    }

    /// @notice Set the protocol fee + recipient.
    /// @dev FEE_SETTER_ROLE only. Capped at 1000 bps (10%) — anything
    ///      higher reverts FeeTooHigh. Applies to subsequent claims only;
    ///      already-mined claims are unaffected.
    ///
    ///      Default protocolFeeBps = 0 at init; this function is the only
    ///      way to flip on a fee. Set recipient to address(0) to "disable"
    ///      the fee (transfer to 0x0 would revert, so practically the fee
    ///      bps should be 0 in that case too).
    /// @param bps Fee in basis points (10000 = 100%). Cap is 1000 (10%).
    /// @param recipient Address that receives the fee on each claim.
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
