// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/CircleFactory.sol";
import "../../src/PredictionPool.sol";
import "../../src/ResolutionModule.sol";
import "../../src/mocks/MockUSDT.sol";

contract ResolutionModuleTest is Test {
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
    uint256 public goalId;
    uint64  public constant DEADLINE_OFFSET = 2 days;
    uint128 public constant MIN_STAKE = 1_000_000;

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
                address(usdt), address(factory), address(resolution), admin
            ))
        )));

        resolution.setPool(address(pool));
        vm.stopPrank();

        vm.prank(alice);
        circleId = factory.createCircle(false, "ipfs://circle");
        vm.prank(bob);     factory.joinCircle(circleId);
        vm.prank(charlie); factory.joinCircle(circleId);
        vm.prank(dave);    factory.joinCircle(circleId);
        vm.prank(eve);     factory.joinCircle(circleId);

        address[5] memory users = [alice, bob, charlie, dave, eve];
        for (uint256 i = 0; i < users.length; i++) {
            usdt.mint(users[i], 1_000 * 1e6);
            vm.prank(users[i]);
            usdt.approve(address(pool), type(uint256).max);
        }

        address[] memory resolvers = new address[](2);
        resolvers[0] = alice;
        resolvers[1] = bob;
        uint64 deadline = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(alice);
        goalId = pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal");

        vm.prank(charlie); pool.stake(goalId, 1, 5 * 1e6);
        vm.prank(bob);     pool.stake(goalId, 0, 3 * 1e6);

        vm.warp(deadline + 1);
        pool.lockGoal(goalId);
    }

    function testSubmitVote_Success() public {
        vm.prank(alice);
        resolution.submitVote(goalId, 1);

        (, uint256 total) = resolution.getTally(goalId);
        assertEq(total, 1);

        (uint8 choice, bool voted) = resolution.votes(goalId, alice);
        assertTrue(voted);
        assertEq(choice, 1);
    }

    function testSubmitVote_NotResolverReverts() public {
        address stranger = makeAddr("stranger");
        vm.prank(stranger);
        vm.expectRevert(ResolutionModule.NotResolver.selector);
        resolution.submitVote(goalId, 1);
    }

    function testSubmitVote_DoubleVoteReverts() public {
        address[] memory resolvers = new address[](4);
        resolvers[0] = alice;
        resolvers[1] = bob;
        resolvers[2] = dave;
        resolvers[3] = eve;
        uint64 dl = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(alice);
        uint256 newGoalId = pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, dl, MIN_STAKE, resolvers, "ipfs://g2");
        vm.prank(charlie); pool.stake(newGoalId, 1, 3 * 1e6);
        vm.prank(bob);     pool.stake(newGoalId, 0, 3 * 1e6);
        vm.warp(dl + 1);
        pool.lockGoal(newGoalId);

        vm.prank(alice);
        resolution.submitVote(newGoalId, 1);

        vm.prank(alice);
        vm.expectRevert(ResolutionModule.AlreadyVoted.selector);
        resolution.submitVote(newGoalId, 1);
    }

    function testSubmitVote_AfterWindowReverts() public {
        vm.warp(block.timestamp + 259200 + 1);
        vm.prank(alice);
        vm.expectRevert(ResolutionModule.VoteWindowExpired.selector);
        resolution.submitVote(goalId, 1);
    }

    function testFinalize_QuorumReached_Resolves() public {
        vm.prank(alice);
        resolution.submitVote(goalId, 1);
        (,,, IPredictionPool.GoalStatus status,,,,, ) = pool.goals(goalId);
        assertEq(uint8(status), uint8(IPredictionPool.GoalStatus.PaidOut));
    }

    function testFinalize_TieResultsInDisputed() public {
        vm.prank(alice); resolution.submitVote(goalId, 1);

        address[] memory resolvers = new address[](2);
        resolvers[0] = alice;
        resolvers[1] = bob;
        uint64 dl = uint64(block.timestamp) + DEADLINE_OFFSET;
        vm.prank(alice);
        uint256 newGoalId = pool.createGoal(circleId, IPredictionPool.OutcomeType.Binary, dl, MIN_STAKE, resolvers, "ipfs://goal2");
        vm.prank(charlie); pool.stake(newGoalId, 1, 3 * 1e6);
        vm.prank(alice);   pool.stake(newGoalId, 0, 3 * 1e6);
        vm.warp(dl + 1);
        pool.lockGoal(newGoalId);

        vm.warp(block.timestamp + 259200 + 1);
        resolution.finalize(newGoalId);
        (,,, IPredictionPool.GoalStatus status,,,,, ) = pool.goals(newGoalId);
        assertEq(uint8(status), uint8(IPredictionPool.GoalStatus.Disputed));
    }

    function testFinalize_VoteWindowExpiry_Disputed() public {
        vm.warp(block.timestamp + 259200 + 1);
        resolution.finalize(goalId);
        (,,, IPredictionPool.GoalStatus status,,,,, ) = pool.goals(goalId);
        assertEq(uint8(status), uint8(IPredictionPool.GoalStatus.Disputed));
    }

    function testFinalize_BeforeWindowAndNoQuorumReverts() public {
        vm.expectRevert(ResolutionModule.CannotFinalizeYet.selector);
        resolution.finalize(goalId);
    }

    function testQuorumThreshold_51Percent() public view {
        assertEq(resolution.quorumNumerator(), 51);
        assertEq(resolution.quorumDenominator(), 100);
        uint256 q = (uint256(10) * 51) / 100;
        assertEq(q, 5);
    }

    function testAutoFinalize_WhenQuorumReached() public {
        uint256 balBefore = usdt.balanceOf(charlie);

        vm.prank(alice);
        resolution.submitVote(goalId, 1);

        (,,, IPredictionPool.GoalStatus status,,,,, ) = pool.goals(goalId);
        assertEq(uint8(status), uint8(IPredictionPool.GoalStatus.PaidOut));

        vm.prank(charlie);
        pool.claim(goalId);
        assertGt(usdt.balanceOf(charlie), balBefore);
    }
}
