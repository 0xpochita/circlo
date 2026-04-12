// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "../src/CircleFactory.sol";
import "../src/PredictionPool.sol";
import "../src/ResolutionModule.sol";
import "../src/RewardDistributor.sol";
import "../src/mocks/MockUSDT.sol";

/// @title Deploy
/// @notice Deploys all Circlo contracts in the correct order
/// @dev Run with: forge script script/Deploy.s.sol --rpc-url <chain> --broadcast --verify -vvvv
contract Deploy is Script {
    // ─────────────────────────────────────────────────────────────────────────
    // Chain-specific constants
    // ─────────────────────────────────────────────────────────────────────────

    address constant USDT_MAINNET  = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e;
    uint256 constant CELO_MAINNET  = 42220;
    uint256 constant CELO_SEPOLIA  = 11142220;
    uint256 constant TIMELOCK_DELAY = 172800; // 48 hours

    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        address deployer   = vm.addr(deployerPk);
        address safe       = vm.envAddress("SAFE_MULTISIG_ADDRESS");
        bool isTestnet     = block.chainid == CELO_SEPOLIA;

        console.log("Deployer:", deployer);
        console.log("Safe:    ", safe);
        console.log("Chain:   ", block.chainid);
        console.log("Testnet: ", isTestnet);

        vm.startBroadcast(deployerPk);

        // ─────────────────────────────────────────────────────────────────────
        // 1. Deploy TimelockController
        // ─────────────────────────────────────────────────────────────────────
        address[] memory proposers = new address[](1);
        proposers[0] = safe;
        address[] memory executors = new address[](1);
        executors[0] = address(0); // anyone can execute after delay

        TimelockController timelock = new TimelockController(
            TIMELOCK_DELAY,
            proposers,
            executors,
            address(0) // no admin after deploy
        );
        console.log("CONTRACT_TIMELOCK=", address(timelock));

        // ─────────────────────────────────────────────────────────────────────
        // 2. Deploy CircleFactory
        // ─────────────────────────────────────────────────────────────────────
        CircleFactory factoryImpl = new CircleFactory();
        CircleFactory factoryProxy = CircleFactory(address(
            new ERC1967Proxy(
                address(factoryImpl),
                abi.encodeCall(CircleFactory.initialize, (deployer))
            )
        ));
        console.log("CONTRACT_CIRCLE_FACTORY=", address(factoryProxy));

        // ─────────────────────────────────────────────────────────────────────
        // 3. Deploy ResolutionModule
        // ─────────────────────────────────────────────────────────────────────
        ResolutionModule resolutionImpl = new ResolutionModule();
        ResolutionModule resolutionProxy = ResolutionModule(address(
            new ERC1967Proxy(
                address(resolutionImpl),
                abi.encodeCall(ResolutionModule.initialize, (deployer, 51, 100, 259200))
            )
        ));
        console.log("CONTRACT_RESOLUTION_MODULE=", address(resolutionProxy));

        // ─────────────────────────────────────────────────────────────────────
        // 4. Deploy PredictionPool
        // ─────────────────────────────────────────────────────────────────────

        // Determine USDT address
        address usdtAddress;
        if (block.chainid == CELO_MAINNET) {
            usdtAddress = USDT_MAINNET;
            console.log("CONTRACT_USDT= (mainnet real USDT)", usdtAddress);
        } else {
            // Testnet: deploy MockUSDT
            MockUSDT mockUsdt = new MockUSDT();
            usdtAddress = address(mockUsdt);
            console.log("CONTRACT_USDT= (MockUSDT testnet)", usdtAddress);
        }

        PredictionPool poolImpl = new PredictionPool();
        PredictionPool poolProxy = PredictionPool(address(
            new ERC1967Proxy(
                address(poolImpl),
                abi.encodeCall(PredictionPool.initialize, (
                    usdtAddress,
                    address(factoryProxy),
                    address(resolutionProxy),
                    deployer
                ))
            )
        ));
        console.log("CONTRACT_PREDICTION_POOL=", address(poolProxy));

        // ─────────────────────────────────────────────────────────────────────
        // 5. Deploy RewardDistributor
        // ─────────────────────────────────────────────────────────────────────
        RewardDistributor rewardImpl = new RewardDistributor();
        RewardDistributor rewardProxy = RewardDistributor(address(
            new ERC1967Proxy(
                address(rewardImpl),
                abi.encodeCall(RewardDistributor.initialize, (usdtAddress, deployer))
            )
        ));
        console.log("CONTRACT_REWARD_DISTRIBUTOR=", address(rewardProxy));

        // ─────────────────────────────────────────────────────────────────────
        // 6. Wire up contracts
        // ─────────────────────────────────────────────────────────────────────
        resolutionProxy.setPool(address(poolProxy));
        poolProxy.setResolutionModule(address(resolutionProxy));

        // ─────────────────────────────────────────────────────────────────────
        // 7. Grant roles to Safe multisig and Timelock
        // ─────────────────────────────────────────────────────────────────────
        bytes32 DEFAULT_ADMIN = 0x00;
        bytes32 PAUSER_ROLE   = keccak256("PAUSER_ROLE");
        bytes32 UPGRADER_ROLE = keccak256("UPGRADER_ROLE");
        bytes32 FEE_SETTER    = keccak256("FEE_SETTER_ROLE");

        // CircleFactory roles
        factoryProxy.grantRole(DEFAULT_ADMIN, address(timelock));
        factoryProxy.grantRole(PAUSER_ROLE,   safe);
        factoryProxy.grantRole(UPGRADER_ROLE, address(timelock));

        // ResolutionModule roles
        resolutionProxy.grantRole(DEFAULT_ADMIN, address(timelock));
        resolutionProxy.grantRole(UPGRADER_ROLE, address(timelock));

        // PredictionPool roles
        poolProxy.grantRole(DEFAULT_ADMIN, address(timelock));
        poolProxy.grantRole(PAUSER_ROLE,   safe);
        poolProxy.grantRole(UPGRADER_ROLE, address(timelock));
        poolProxy.grantRole(FEE_SETTER,    safe);

        // RewardDistributor roles
        rewardProxy.grantRole(DEFAULT_ADMIN, address(timelock));
        rewardProxy.grantRole(UPGRADER_ROLE, address(timelock));

        // ─────────────────────────────────────────────────────────────────────
        // 8. Renounce deployer's DEFAULT_ADMIN_ROLE from all contracts
        // ─────────────────────────────────────────────────────────────────────
        factoryProxy.renounceRole(DEFAULT_ADMIN, deployer);
        resolutionProxy.renounceRole(DEFAULT_ADMIN, deployer);
        poolProxy.renounceRole(DEFAULT_ADMIN, deployer);
        rewardProxy.renounceRole(DEFAULT_ADMIN, deployer);

        vm.stopBroadcast();

        // ─────────────────────────────────────────────────────────────────────
        // 9. Print deployment summary
        // ─────────────────────────────────────────────────────────────────────
        console.log("");
        console.log("=== DEPLOYMENT COMPLETE ===");
        console.log("DEPLOY_BLOCK=", block.number);
        console.log("CONTRACT_CIRCLE_FACTORY=", address(factoryProxy));
        console.log("CONTRACT_PREDICTION_POOL=", address(poolProxy));
        console.log("CONTRACT_RESOLUTION_MODULE=", address(resolutionProxy));
        console.log("CONTRACT_REWARD_DISTRIBUTOR=", address(rewardProxy));
        console.log("CONTRACT_TIMELOCK=", address(timelock));
        console.log("CONTRACT_USDT=", usdtAddress);
    }
}
