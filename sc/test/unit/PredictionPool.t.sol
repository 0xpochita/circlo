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
    uint128 public constant MIN_STAKE       = 1_000_000;

    function setUp() public {
        usdt = new MockUSDT();

        vm.startPrank(admin);
        CircleFactory factoryImpl = new CircleFactory();
        factory = CircleFactory(address(new ERC1967Proxy(
            address(factoryImpl),
            abi.encodeCall(CircleFactory.initialize, (admin))
        )));

        ResolutionModule resImpl = new ResolutionModule();
        resolution = ResolutionModule(address(new ERC1967Proxy(
            address(resImpl),
            abi.encodeCall(ResolutionModule.initialize, (admin, 51, 100, 259200))
        )));

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

        resolution.setPool(address(pool));
        pool.setResolutionModule(address(resolution));
        vm.stopPrank();

        vm.prank(alice);
        circleId = factory.createCircle(false, "ipfs://circle");
        vm.prank(bob);    factory.joinCircle(circleId);
        vm.prank(charlie); factory.joinCircle(circleId);
        vm.prank(dave);   factory.joinCircle(circleId);
        vm.prank(eve);    factory.joinCircle(circleId);

        address[5] memory users = [alice, bob, charlie, dave, eve];
        for (uint256 i = 0; i < users.length; i++) {
            usdt.mint(users[i], 1_000 * 1e6);
            vm.prank(users[i]);
            usdt.approve(address(pool), type(uint256).max);
        }
    }

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
        vm.prank(alice);
        resolution.submitVote(goalId, winningSide);
    }

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
        uint64 badDeadline = uint64(block.timestamp) + 30 minutes;
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
        for (uint256 i = 0; i < resolvers.length; i++) {
            resolvers[i] = alice;
        }
        uint64 deadline = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(alice);
        vm.expectRevert(PredictionPool.TooManyResolvers.selector);
        pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal");
    }

    function testCreateGoal_ResolverNotMemberReverts() public {
        address stranger = makeAddr("stranger");
        address[] memory resolvers = new address[](1);
        resolvers[0] = stranger;
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

    function testStake_Success() public {
        uint256 goalId = _createGoal();
        vm.prank(bob);
        pool.stake(goalId, 1, 5 * 1e6);
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
        vm.prank(charlie);
        vm.expectRevert(PredictionPool.GoalNotOpen.selector);
        pool.stake(goalId, 0, 5 * 1e6);
    }

    function testStake_SwitchSidesReverts() public {
        uint256 goalId = _createGoal();
        vm.prank(bob);
        pool.stake(goalId, 1, 5 * 1e6);
        vm.prank(bob);
        vm.expectRevert(PredictionPool.CannotSwitchSides.selector);
        pool.stake(goalId, 0, 5 * 1e6);
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

    function testClaim_TwoParticipantsCorrectMath() public {
        uint256 goalId = _createGoal();
        vm.prank(bob);  pool.stake(goalId, 1, 10 * 1e6);
        vm.prank(dave); pool.stake(goalId, 0, 5 * 1e6);
        _lockGoal(goalId);
        _resolveGoal(goalId, 1);

        uint256 balBefore = usdt.balanceOf(bob);
        vm.prank(bob);
        pool.claim(goalId);
        assertEq(usdt.balanceOf(bob) - balBefore, 15 * 1e6);
    }

    function testClaim_ThreeParticipantsCorrectMath() public {
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
        vm.prank(dave);
        vm.expectRevert(PredictionPool.NothingToClaim.selector);
        pool.claim(goalId);
    }

    function testClaim_WhenWinningPoolZero_RefundsLosingPool() public {
        uint256 goalId = _createGoal();
        vm.prank(dave); pool.stake(goalId, 0, 10 * 1e6);
        _lockGoal(goalId);
        _resolveGoal(goalId, 1);

        uint256 balBefore = usdt.balanceOf(dave);
        vm.prank(dave);
        pool.claim(goalId);
        assertEq(usdt.balanceOf(dave) - balBefore, 10 * 1e6);
    }

    function _createDisputedGoal() internal returns (uint256 goalId) {
        address[] memory resolvers = new address[](2);
        resolvers[0] = alice;
        resolvers[1] = bob;
        uint64 deadline = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(alice);
        goalId = pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal");

        vm.prank(charlie); pool.stake(goalId, 1, 5 * 1e6);
        vm.prank(dave);    pool.stake(goalId, 0, 5 * 1e6);
        _lockGoal(goalId);

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
        _resolveGoal(goalId, 1);
        vm.prank(dave);
        vm.expectRevert(PredictionPool.GoalNotDisputed.selector);
        pool.refund(goalId);
    }

    function testFuzz_StakeRandomAmounts(uint128 amount) public {
        vm.assume(amount >= MIN_STAKE);
        vm.assume(amount <= 500 * 1e6);

        uint256 goalId = _createGoal();
        vm.prank(bob);
        pool.stake(goalId, 1, amount);
        assertEq(pool.stakeOf(goalId, bob, 1), amount);
    }

    function testFuzz_ClaimArbitraryDistribution(uint128[5] memory amounts) public {
        for (uint256 i = 0; i < 5; i++) {
            amounts[i] = uint128(bound(uint256(amounts[i]), uint256(MIN_STAKE), 100 * 1e6));
        }
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

        if (winPool == 0) return;

        _lockGoal(goalId);
        _resolveGoal(goalId, 1);

        uint256 totalPayout = 0;
        for (uint256 i = 0; i < 3; i++) {
            uint256 balBefore = usdt.balanceOf(users[i]);
            vm.prank(users[i]);
            pool.claim(goalId);
            totalPayout += usdt.balanceOf(users[i]) - balBefore;
        }
        assertLe(totalPayout, winPool + losePool);
        assertGe(totalPayout + 3, winPool + losePool);
    }
}
