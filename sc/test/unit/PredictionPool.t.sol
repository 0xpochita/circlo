// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/CircleFactory.sol";
import "../../src/PredictionPool.sol";
import "../../src/ResolutionModule.sol";
import "../../src/mocks/MockUSDT.sol";

contract PredictionPoolTest is Test {
    MockUSDT         public usdt;
    CircleFactory    public factory;
    ResolutionModule public resolution;
    PredictionPool   public pool;

    address public admin   = makeAddr("admin");
    address public alice   = makeAddr("alice");
    address public bob     = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public dave    = makeAddr("dave");
    address public eve     = makeAddr("eve");

    uint256 public circleId;
    uint64  public constant DEADLINE_OFFSET = 2 days;
    uint128 public constant MIN_STAKE       = 1_000_000; // 1 USDT

    function setUp() public {
        // Deploy MockUSDT
        usdt = new MockUSDT();

        // Deploy CircleFactory proxy
        vm.startPrank(admin);
        CircleFactory factoryImpl = new CircleFactory();
        factory = CircleFactory(address(new ERC1967Proxy(
            address(factoryImpl),
            abi.encodeCall(CircleFactory.initialize, (admin))
        )));

        // Deploy ResolutionModule proxy
        ResolutionModule resImpl = new ResolutionModule();
        resolution = ResolutionModule(address(new ERC1967Proxy(
            address(resImpl),
            abi.encodeCall(ResolutionModule.initialize, (admin, 51, 100, 259200))
        )));

        // Deploy PredictionPool proxy
        PredictionPool poolImpl = new PredictionPool();
        pool = PredictionPool(address(new ERC1967Proxy(
            address(poolImpl),
            abi.encodeCall(PredictionPool.initialize, (
                address(usdt),
                address(factory),
                address(resolution),
                admin
            ))
        )));

        // Wire up: resolution needs pool, pool needs resolution
        resolution.setPool(address(pool));
        // pool already has resolution in initialize; update is idempotent
        pool.setResolutionModule(address(resolution));
        vm.stopPrank();

        // Create a circle with alice as owner, add bob, charlie, dave
        vm.prank(alice);
        circleId = factory.createCircle(false, "ipfs://circle");
        vm.prank(bob);    factory.joinCircle(circleId);
        vm.prank(charlie); factory.joinCircle(circleId);
        vm.prank(dave);   factory.joinCircle(circleId);
        vm.prank(eve);    factory.joinCircle(circleId);

        // Mint & approve USDT for all test users
        address[5] memory users = [alice, bob, charlie, dave, eve];
        for (uint256 i = 0; i < users.length; i++) {
            usdt.mint(users[i], 1_000 * 1e6); // 1000 USDT each
            vm.prank(users[i]);
            usdt.approve(address(pool), type(uint256).max);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────

    function _createGoal() internal returns (uint256 goalId) {
        address[] memory resolvers = new address[](1);
        resolvers[0] = alice;
        uint64 deadline = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(alice);
        goalId = pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal");
    }

    function _lockGoal(uint256 goalId) internal {
        (,,,, uint64 deadline,,,,) = pool.goals(goalId);
        vm.warp(deadline + 1);
        pool.lockGoal(goalId);
    }

    function _resolveGoal(uint256 goalId, uint8 winningSide) internal {
        // alice is resolver; submit vote and auto-finalize (1 resolver, 51/100 quorum rounds to 1)
        vm.prank(alice);
        resolution.submitVote(goalId, winningSide);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // createGoal tests
    // ─────────────────────────────────────────────────────────────────────────

    function testCreateGoal_Success() public {
        uint256 goalId = _createGoal();
        (uint256 cid, address creator,,,,,,,) = pool.goals(goalId);
        assertEq(cid, circleId);
        assertEq(creator, alice);
    }

    function testCreateGoal_NotMemberReverts() public {
        address stranger = makeAddr("stranger");
        address[] memory resolvers = new address[](1);
        resolvers[0] = alice;
        uint64 deadline = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(stranger);
        vm.expectRevert(PredictionPool.NotCircleMember.selector);
        pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal");
    }

    function testCreateGoal_DeadlineTooSoonReverts() public {
        address[] memory resolvers = new address[](1);
        resolvers[0] = alice;
        uint64 badDeadline = uint64(block.timestamp) + 30 minutes; // less than 1 hour
        vm.prank(alice);
        vm.expectRevert(PredictionPool.DeadlineTooSoon.selector);
        pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, badDeadline, MIN_STAKE, resolvers, "ipfs://goal");
    }

    function testCreateGoal_NoResolverReverts() public {
        address[] memory resolvers = new address[](0);
        uint64 deadline = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(alice);
        vm.expectRevert(PredictionPool.NoResolvers.selector);
        pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal");
    }

    function testCreateGoal_TooManyResolversReverts() public {
        address[] memory resolvers = new address[](33);
        // all must be members
        for (uint256 i = 0; i < resolvers.length; i++) {
            resolvers[i] = alice; // reuse alice
        }
        uint64 deadline = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(alice);
        vm.expectRevert(PredictionPool.TooManyResolvers.selector);
        pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal");
    }

    function testCreateGoal_ResolverNotMemberReverts() public {
        address stranger = makeAddr("stranger");
        address[] memory resolvers = new address[](1);
        resolvers[0] = stranger; // not a member
        uint64 deadline = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(alice);
        vm.expectRevert(PredictionPool.ResolverNotMember.selector);
        pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal");
    }

    function testCreateGoal_EmitsEvent() public {
        address[] memory resolvers = new address[](1);
        resolvers[0] = alice;
        uint64 deadline = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.expectEmit(true, true, true, false);
        emit IPredictionPool.GoalCreated(0, circleId, alice, uint8(IPredictionPool.OutcomeType.Binary), deadline, MIN_STAKE, resolvers, "ipfs://goal");
        vm.prank(alice);
        pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal");
    }

    // ─────────────────────────────────────────────────────────────────────────
    // stake tests
    // ─────────────────────────────────────────────────────────────────────────

    function testStake_Success() public {
        uint256 goalId = _createGoal();
        vm.prank(bob);
        pool.stake(goalId, 1, 5 * 1e6); // 5 USDT on Yes
        assertEq(pool.stakeOf(goalId, bob, 1), 5 * 1e6);
        assertEq(pool.poolPerSide(goalId, 1), 5 * 1e6);
    }

    function testStake_BelowMinStakeReverts() public {
        uint256 goalId = _createGoal();
        vm.prank(bob);
        vm.expectRevert(PredictionPool.BelowMinStake.selector);
        pool.stake(goalId, 1, MIN_STAKE - 1);
    }

    function testStake_AfterDeadlineReverts() public {
        uint256 goalId = _createGoal();
        (,,,, uint64 deadline,,,,) = pool.goals(goalId);
        vm.warp(deadline + 1);
        vm.prank(bob);
        vm.expectRevert(PredictionPool.DeadlinePassed.selector);
        pool.stake(goalId, 1, 5 * 1e6);
    }

    function testStake_OnResolvedGoalReverts() public {
        uint256 goalId = _createGoal();
        vm.prank(bob);
        pool.stake(goalId, 1, 5 * 1e6);
        vm.prank(dave);
        pool.stake(goalId, 0, 3 * 1e6);
        _lockGoal(goalId);
        _resolveGoal(goalId, 1);
        // status is now PaidOut — try to stake
        vm.prank(charlie);
        vm.expectRevert(PredictionPool.GoalNotOpen.selector);
        pool.stake(goalId, 0, 5 * 1e6);
    }

    function testStake_SwitchSidesReverts() public {
        uint256 goalId = _createGoal();
        vm.prank(bob);
        pool.stake(goalId, 1, 5 * 1e6); // staked Yes
        vm.prank(bob);
        vm.expectRevert(PredictionPool.CannotSwitchSides.selector);
        pool.stake(goalId, 0, 5 * 1e6); // try to switch to No
    }

    function testStake_NotMemberReverts() public {
        uint256 goalId = _createGoal();
        address stranger = makeAddr("stranger");
        usdt.mint(stranger, 100 * 1e6);
        vm.prank(stranger);
        usdt.approve(address(pool), type(uint256).max);
        vm.prank(stranger);
        vm.expectRevert(PredictionPool.NotCircleMember.selector);
        pool.stake(goalId, 1, 5 * 1e6);
    }

    function testStake_EmitsEvent() public {
        uint256 goalId = _createGoal();
        vm.expectEmit(true, true, false, true);
        emit IPredictionPool.Staked(goalId, bob, 1, 5 * 1e6);
        vm.prank(bob);
        pool.stake(goalId, 1, 5 * 1e6);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // lockGoal tests
    // ─────────────────────────────────────────────────────────────────────────

    function testLockGoal_Success() public {
        uint256 goalId = _createGoal();
        (,,,, uint64 deadline,,,,) = pool.goals(goalId);
        vm.warp(deadline + 1);
        pool.lockGoal(goalId);
        (,,, IPredictionPool.GoalStatus status,,,,, ) = pool.goals(goalId);
        assertEq(uint8(status), uint8(IPredictionPool.GoalStatus.Resolving));
    }

    function testLockGoal_BeforeDeadlineReverts() public {
        uint256 goalId = _createGoal();
        vm.expectRevert(PredictionPool.DeadlineNotPassed.selector);
        pool.lockGoal(goalId);
    }

    function testLockGoal_AlreadyLockedReverts() public {
        uint256 goalId = _createGoal();
        _lockGoal(goalId);
        vm.expectRevert(PredictionPool.GoalNotOpen.selector);
        pool.lockGoal(goalId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // claim tests
    // ─────────────────────────────────────────────────────────────────────────

    function testClaim_TwoParticipantsCorrectMath() public {
        // Bob stakes 10 USDT Yes, Dave stakes 5 USDT No
        // winningPool=10, losingPool=5
        // Bob payout = 10 + (10 * 5) / 10 = 10 + 5 = 15
        uint256 goalId = _createGoal();
        vm.prank(bob);  pool.stake(goalId, 1, 10 * 1e6);
        vm.prank(dave); pool.stake(goalId, 0, 5 * 1e6);
        _lockGoal(goalId);
        _resolveGoal(goalId, 1); // Yes wins

        uint256 balBefore = usdt.balanceOf(bob);
        vm.prank(bob);
        pool.claim(goalId);
        assertEq(usdt.balanceOf(bob) - balBefore, 15 * 1e6);
    }

    function testClaim_ThreeParticipantsCorrectMath() public {
        // Bob 6 USDT Yes, Charlie 4 USDT Yes, Dave 10 USDT No → Yes wins
        // winningPool=10, losingPool=10
        // Bob payout = 6 + (6*10)/10 = 6 + 6 = 12
        // Charlie payout = 4 + (4*10)/10 = 4 + 4 = 8
        uint256 goalId = _createGoal();
        vm.prank(bob);     pool.stake(goalId, 1, 6 * 1e6);
        vm.prank(charlie); pool.stake(goalId, 1, 4 * 1e6);
        vm.prank(dave);    pool.stake(goalId, 0, 10 * 1e6);
        _lockGoal(goalId);
        _resolveGoal(goalId, 1);

        uint256 bobBal     = usdt.balanceOf(bob);
        uint256 charlieBal = usdt.balanceOf(charlie);
        vm.prank(bob);     pool.claim(goalId);
        vm.prank(charlie); pool.claim(goalId);
        assertEq(usdt.balanceOf(bob)     - bobBal,     12 * 1e6);
        assertEq(usdt.balanceOf(charlie) - charlieBal,  8 * 1e6);
    }

    function testClaim_ManyParticipantsCorrectMath() public {
        // Alice, Bob, Charlie each stake 3 USDT Yes; Dave 3 USDT No; Eve 6 USDT No
        // winningPool=9, losingPool=9, each winner gets 3 + (3*9)/9 = 6
        uint256 goalId = _createGoal();
        vm.prank(alice);   pool.stake(goalId, 1, 3 * 1e6);
        vm.prank(bob);     pool.stake(goalId, 1, 3 * 1e6);
        vm.prank(charlie); pool.stake(goalId, 1, 3 * 1e6);
        vm.prank(dave);    pool.stake(goalId, 0, 3 * 1e6);
        vm.prank(eve);     pool.stake(goalId, 0, 6 * 1e6);
        _lockGoal(goalId);
        _resolveGoal(goalId, 1);

        for (uint256 i = 0; i < 3; i++) {
            address winner = i == 0 ? alice : i == 1 ? bob : charlie;
            uint256 balBefore = usdt.balanceOf(winner);
            vm.prank(winner);
            pool.claim(goalId);
            assertEq(usdt.balanceOf(winner) - balBefore, 6 * 1e6);
        }
    }

    function testClaim_DoubleClaimReverts() public {
        uint256 goalId = _createGoal();
        vm.prank(bob);  pool.stake(goalId, 1, 10 * 1e6);
        vm.prank(dave); pool.stake(goalId, 0, 5 * 1e6);
        _lockGoal(goalId);
        _resolveGoal(goalId, 1);
        vm.prank(bob);
        pool.claim(goalId);
        vm.prank(bob);
        vm.expectRevert(PredictionPool.AlreadyClaimed.selector);
        pool.claim(goalId);
    }

    function testClaim_LoserCannotClaim() public {
        uint256 goalId = _createGoal();
        vm.prank(bob);  pool.stake(goalId, 1, 10 * 1e6);
        vm.prank(dave); pool.stake(goalId, 0, 5 * 1e6);
        _lockGoal(goalId);
        _resolveGoal(goalId, 1);
        vm.prank(dave); // dave staked No (losing side)
        vm.expectRevert(PredictionPool.NothingToClaim.selector);
        pool.claim(goalId);
    }

    function testClaim_WhenWinningPoolZero_RefundsLosingPool() public {
        // Nobody stakes Yes; all stake No; resolution says Yes won
        // Special case: winning pool is 0, losing stakers get refund
        uint256 goalId = _createGoal();
        vm.prank(dave); pool.stake(goalId, 0, 10 * 1e6); // only No stakers
        _lockGoal(goalId);
        // Directly set winner via resolution (alice is resolver; side 1 = Yes won but no one staked Yes)
        _resolveGoal(goalId, 1);

        uint256 balBefore = usdt.balanceOf(dave);
        vm.prank(dave);
        pool.claim(goalId); // should refund 10 USDT
        assertEq(usdt.balanceOf(dave) - balBefore, 10 * 1e6);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // refund tests
    // ─────────────────────────────────────────────────────────────────────────

    function _createDisputedGoal() internal returns (uint256 goalId) {
        // Create goal with 2 resolvers (alice and bob)
        address[] memory resolvers = new address[](2);
        resolvers[0] = alice;
        resolvers[1] = bob;
        uint64 deadline = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(alice);
        goalId = pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal");

        vm.prank(charlie); pool.stake(goalId, 1, 5 * 1e6);
        vm.prank(dave);    pool.stake(goalId, 0, 5 * 1e6);
        _lockGoal(goalId);

        // Let the vote window expire without any votes → 0 == 0 tie → Disputed
        vm.warp(block.timestamp + 259200 + 1);
        resolution.finalize(goalId);
    }

    function testRefund_OnDisputedGoal() public {
        uint256 goalId = _createDisputedGoal();
        (,,, IPredictionPool.GoalStatus status,,,,, ) = pool.goals(goalId);
        assertEq(uint8(status), uint8(IPredictionPool.GoalStatus.Disputed));

        uint256 charlieBal = usdt.balanceOf(charlie);
        vm.prank(charlie);
        pool.refund(goalId);
        assertEq(usdt.balanceOf(charlie) - charlieBal, 5 * 1e6);
    }

    function testRefund_DoubleRefundReverts() public {
        uint256 goalId = _createDisputedGoal();
        vm.prank(charlie);
        pool.refund(goalId);
        vm.prank(charlie);
        vm.expectRevert(PredictionPool.AlreadyClaimed.selector);
        pool.refund(goalId);
    }

    function testRefund_OnNonDisputedReverts() public {
        uint256 goalId = _createGoal();
        vm.prank(bob);  pool.stake(goalId, 1, 10 * 1e6);
        vm.prank(dave); pool.stake(goalId, 0, 5 * 1e6);
        _lockGoal(goalId);
        _resolveGoal(goalId, 1); // resolved, not disputed
        vm.prank(dave);
        vm.expectRevert(PredictionPool.GoalNotDisputed.selector);
        pool.refund(goalId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fuzz tests
    // ─────────────────────────────────────────────────────────────────────────

    /// @dev Fuzz test: any amount >= minStake should be stakeable
    function testFuzz_StakeRandomAmounts(uint128 amount) public {
        vm.assume(amount >= MIN_STAKE);
        vm.assume(amount <= 500 * 1e6); // cap at 500 USDT to stay within minted balance

        uint256 goalId = _createGoal();
        vm.prank(bob);
        pool.stake(goalId, 1, amount);
        assertEq(pool.stakeOf(goalId, bob, 1), amount);
    }

    /// @dev Fuzz test: payouts should sum to total pool (no leakage)
    function testFuzz_ClaimArbitraryDistribution(uint128[5] memory amounts) public {
        // clamp amounts to [minStake, 100 USDT]
        for (uint256 i = 0; i < 5; i++) {
            amounts[i] = uint128(bound(uint256(amounts[i]), uint256(MIN_STAKE), 100 * 1e6));
        }
        // First 3 stake Yes, last 2 stake No
        address[5] memory users = [alice, bob, charlie, dave, eve];
        uint256 goalId = _createGoal();

        uint256 winPool = 0;
        uint256 losePool = 0;
        for (uint256 i = 0; i < 5; i++) {
            uint8 side = i < 3 ? 1 : 0;
            vm.prank(users[i]);
            pool.stake(goalId, side, amounts[i]);
            if (side == 1) winPool += amounts[i];
            else           losePool += amounts[i];
        }

        if (winPool == 0) return; // skip edge case handled in other test

        _lockGoal(goalId);
        _resolveGoal(goalId, 1); // Yes wins

        // Sum all payouts and verify equals total pool
        uint256 totalPayout = 0;
        for (uint256 i = 0; i < 3; i++) {
            uint256 balBefore = usdt.balanceOf(users[i]);
            vm.prank(users[i]);
            pool.claim(goalId);
            totalPayout += usdt.balanceOf(users[i]) - balBefore;
        }
        // Due to integer division rounding, totalPayout may be <= totalPool
        assertLe(totalPayout, winPool + losePool);
        // And at most 1 wei per winner lost to rounding
        assertGe(totalPayout + 3, winPool + losePool);
    }
}
