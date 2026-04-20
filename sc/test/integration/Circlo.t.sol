// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/CircleFactory.sol";
import "../../src/PredictionPool.sol";
import "../../src/ResolutionModule.sol";
import "../../src/RewardDistributor.sol";
import "../../src/mocks/MockUSDT.sol";

contract CircleFactoryV2 is CircleFactory {
    function getVersion() external pure returns (uint256) {
        return 2;
    }
}

contract CircloIntegrationTest is Test {
    MockUSDT            public usdt;
    CircleFactory       public factory;
    ResolutionModule    public resolution;
    PredictionPool      public pool;
    RewardDistributor   public rewardDist;

    address public admin   = makeAddr("admin");
    address public alice   = makeAddr("alice");
    address public bob     = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public dave    = makeAddr("dave");

    uint128 public constant MIN_STAKE = 1_000_000;

    function _deployAll() internal {
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
        RewardDistributor rdImpl = new RewardDistributor();
        rewardDist = RewardDistributor(address(new ERC1967Proxy(
            address(rdImpl),
            abi.encodeCall(RewardDistributor.initialize, (address(usdt), admin))
        )));
        resolution.setPool(address(pool));
        vm.stopPrank();

        address[4] memory users = [alice, bob, charlie, dave];
        for (uint256 i = 0; i < users.length; i++) {
            usdt.mint(users[i], 1_000 * 1e6);
            vm.prank(users[i]);
            usdt.approve(address(pool), type(uint256).max);
        }
    }

    function setUp() public {
        _deployAll();
    }

    function testFullFlow_CreateCircle_CreateGoal_Stake_Vote_Claim() public {
        vm.prank(alice);
        uint256 circleId = factory.createCircle(false, "ipfs://circle");

        vm.prank(bob);     factory.joinCircle(circleId);
        vm.prank(charlie); factory.joinCircle(circleId);
        vm.prank(dave);    factory.joinCircle(circleId);

        address[] memory resolvers = new address[](1);
        resolvers[0] = bob;
        uint64 deadline = uint64(block.timestamp) + 2 days;
        vm.prank(alice);
        uint256 goalId = pool.createGoal(
            circleId,
            IPredictionPool.OutcomeType.Binary,
            deadline,
            MIN_STAKE,
            resolvers,
            "ipfs://goal"
        );

        vm.prank(bob);     pool.stake(goalId, 1, 10 * 1e6);
        vm.prank(charlie); pool.stake(goalId, 1, 5 * 1e6);
        vm.prank(dave);    pool.stake(goalId, 0, 6 * 1e6);

        vm.warp(deadline + 1);
        pool.lockGoal(goalId);

        vm.prank(bob);
        resolution.submitVote(goalId, 1);

        (,,, IPredictionPool.GoalStatus status,,,,, ) = pool.goals(goalId);
        assertEq(uint8(status), uint8(IPredictionPool.GoalStatus.PaidOut));

        uint256 bobBalBefore     = usdt.balanceOf(bob);
        uint256 charlieBalBefore = usdt.balanceOf(charlie);

        vm.prank(bob);     pool.claim(goalId);
        vm.prank(charlie); pool.claim(goalId);

        assertEq(usdt.balanceOf(bob)     - bobBalBefore,     14 * 1e6);
        assertEq(usdt.balanceOf(charlie) - charlieBalBefore,  7 * 1e6);

        vm.prank(dave);
        vm.expectRevert(PredictionPool.NothingToClaim.selector);
        pool.claim(goalId);
    }

    function testFullFlow_DisputedGoal_Refund() public {
        vm.prank(alice);
        uint256 circleId = factory.createCircle(false, "ipfs://circle");
        vm.prank(bob);     factory.joinCircle(circleId);
        vm.prank(charlie); factory.joinCircle(circleId);
        vm.prank(dave);    factory.joinCircle(circleId);

        address[] memory resolvers = new address[](2);
        resolvers[0] = alice;
        resolvers[1] = bob;
        uint64 deadline = uint64(block.timestamp) + 2 days;
        vm.prank(alice);
        uint256 goalId = pool.createGoal(
            circleId, IPredictionPool.OutcomeType.Binary, deadline, MIN_STAKE, resolvers, "ipfs://goal"
        );

        uint256 charlieStake = 8 * 1e6;
        uint256 daveStake    = 4 * 1e6;
        vm.prank(charlie); pool.stake(goalId, 1, charlieStake);
        vm.prank(dave);    pool.stake(goalId, 0, daveStake);

        vm.warp(deadline + 1);
        pool.lockGoal(goalId);

        vm.warp(block.timestamp + 259200 + 1);
        resolution.finalize(goalId);

        (,,, IPredictionPool.GoalStatus status,,,,, ) = pool.goals(goalId);
        assertEq(uint8(status), uint8(IPredictionPool.GoalStatus.Disputed));

        uint256 charlieBalBefore = usdt.balanceOf(charlie);
        uint256 daveBalBefore    = usdt.balanceOf(dave);

        vm.prank(charlie); pool.refund(goalId);
        vm.prank(dave);    pool.refund(goalId);

        assertEq(usdt.balanceOf(charlie) - charlieBalBefore, charlieStake);
        assertEq(usdt.balanceOf(dave)    - daveBalBefore,    daveStake);

        assertEq(usdt.balanceOf(address(pool)), 0);
    }

    function testUpgrade_PreservesStorage() public {
        vm.prank(alice);
        uint256 circleId1 = factory.createCircle(false, "ipfs://c1");
        vm.prank(bob); factory.joinCircle(circleId1);

        vm.prank(alice);
        uint256 circleId2 = factory.createCircle(true, "ipfs://c2");

        assertEq(factory.nextCircleId(), 2);
        assertTrue(factory.isCircleMember(circleId1, alice));
        assertTrue(factory.isCircleMember(circleId1, bob));
        assertEq(factory.getCircle(circleId2).owner, alice);

        bytes32 upgraderRole = keccak256("UPGRADER_ROLE");

        vm.prank(admin);
        factory.grantRole(upgraderRole, admin);

        CircleFactoryV2 v2Impl = new CircleFactoryV2();

        vm.prank(admin);
        factory.upgradeToAndCall(address(v2Impl), "");

        assertEq(factory.nextCircleId(), 2);
        assertTrue(factory.isCircleMember(circleId1, alice));
        assertTrue(factory.isCircleMember(circleId1, bob));
        assertEq(factory.getCircle(circleId2).owner, alice);

        CircleFactoryV2 factoryV2 = CircleFactoryV2(address(factory));
        assertEq(factoryV2.getVersion(), 2);
    }
}

contract CircloInvariantTest is Test {
    MockUSDT         public usdt;
    CircleFactory    public factory;
    ResolutionModule public resolution;
    PredictionPool   public pool;

    address public admin   = makeAddr("admin");
    address public alice   = makeAddr("alice");
    address public bob     = makeAddr("bob");
    address public charlie = makeAddr("charlie");
    address public dave    = makeAddr("dave");

    uint256 public circleId;
    uint256 public goalId;

    uint256 public totalStaked;

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
        circleId = factory.createCircle(false, "ipfs://c");
        vm.prank(bob);     factory.joinCircle(circleId);
        vm.prank(charlie); factory.joinCircle(circleId);
        vm.prank(dave);    factory.joinCircle(circleId);

        address[4] memory users = [alice, bob, charlie, dave];
        for (uint256 i = 0; i < users.length; i++) {
            usdt.mint(users[i], 10_000 * 1e6);
            vm.prank(users[i]);
            usdt.approve(address(pool), type(uint256).max);
        }

        address[] memory resolvers = new address[](1);
        resolvers[0] = alice;
        uint64 deadline = uint64(block.timestamp) + 2 days;
        vm.prank(alice);
        goalId = pool.createGoal(
            circleId, IPredictionPool.OutcomeType.Binary, deadline, 1_000_000, resolvers, "ipfs://g"
        );

        vm.prank(bob);     pool.stake(goalId, 1, 10 * 1e6); totalStaked += 10 * 1e6;
        vm.prank(charlie); pool.stake(goalId, 1, 5 * 1e6);  totalStaked += 5 * 1e6;
        vm.prank(dave);    pool.stake(goalId, 0, 8 * 1e6);  totalStaked += 8 * 1e6;
    }

    function invariant_ContractBalanceGteUnclaimedPool() public view {
        uint256 contractBalance = usdt.balanceOf(address(pool));
        (,,,, , , uint128 totalPool,,) = pool.goals(goalId);
        assertGe(contractBalance, totalPool);
    }

    function invariant_SumOfStakesMatchesPoolPerSide() public view {
        uint256 side0 = pool.poolPerSide(goalId, 0);
        uint256 side1 = pool.poolPerSide(goalId, 1);
        (,,,,,, uint128 totalPool,,) = pool.goals(goalId);
        assertEq(side0 + side1, uint256(totalPool));
    }
}
