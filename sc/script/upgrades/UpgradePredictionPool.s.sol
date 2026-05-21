// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "@openzeppelin/contracts/governance/TimelockController.sol";
import "../../src/PredictionPool.sol";

contract UpgradePredictionPool is Script {
    PredictionPool public predictionPoolProxy;
    PredictionPool public predictionPoolImpl;

    address constant PREDICTION_POOL_PROXY = 0xE9cFa67358476194414ae3306888FfeCb8f41139;
    address constant TIMELOCK              = 0xc6B9554fAA6703645f9AC65794CF2321cB82fE47;
    address constant GRANTEE               = 0xff54De834290795E28b5eE2C018d760a2921b80d;

    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    bytes32 public constant PREDECESSOR        = bytes32(0);
    bytes32 public constant SALT               = keccak256("circlo.grant-admin.ff54.v1");
    uint256 public constant DELAY              = 172800; // 48h — must be >= timelock.getMinDelay()

    function run() external view {
        console.log("Use --sig to pick a phase:");
        console.log("  scheduleGrantAdmin()  -> schedule grantRole via timelock (proposer)");
        console.log("  executeGrantAdmin()   -> execute after 48h (open executor)");
        console.log("  upgrade()             -> deploy new impl + upgradeToAndCall");
        console.log("");
        console.log("Operation id for the grant:");
        console.logBytes32(_operationId());
    }

    // --- Phase 1: schedule grantRole via Timelock (run from PROPOSER) ---
    function scheduleGrantAdmin() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.createSelectFork("celo");
        vm.startBroadcast(pk);

        TimelockController(payable(TIMELOCK)).schedule(
            PREDICTION_POOL_PROXY,
            0,
            _grantData(),
            PREDECESSOR,
            SALT,
            DELAY
        );

        vm.stopBroadcast();

        bytes32 opId = _operationId();
        uint256 eta  = TimelockController(payable(TIMELOCK)).getTimestamp(opId);
        console.log("Scheduled. operation id:");
        console.logBytes32(opId);
        console.log("ETA (unix):", eta);
    }

    // --- Phase 2: execute after 48h (executor is open — anyone can call) ---
    function executeGrantAdmin() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.createSelectFork("celo");
        vm.startBroadcast(pk);

        TimelockController(payable(TIMELOCK)).execute(
            PREDICTION_POOL_PROXY,
            0,
            _grantData(),
            PREDECESSOR,
            SALT
        );

        vm.stopBroadcast();

        bool granted = PredictionPool(PREDICTION_POOL_PROXY).hasRole(DEFAULT_ADMIN_ROLE, GRANTEE);
        console.log("Executed. hasRole(DEFAULT_ADMIN_ROLE, GRANTEE):", granted);
    }

    // --- Cancel scheduled op (run from CANCELLER, deployer has this) ---
    function cancelGrantAdmin() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.createSelectFork("celo");
        vm.startBroadcast(pk);
        TimelockController(payable(TIMELOCK)).cancel(_operationId());
        vm.stopBroadcast();
    }

    // --- Upgrade impl (caller must hold UPGRADER_ROLE on the proxy) ---
    function upgrade() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        vm.createSelectFork("celo");
        vm.startBroadcast(pk);

        predictionPoolImpl = new PredictionPool();
        predictionPoolProxy = PredictionPool(PREDICTION_POOL_PROXY);
        predictionPoolProxy.upgradeToAndCall(address(predictionPoolImpl), "");

        vm.stopBroadcast();

        console.log("Upgraded impl ->", address(predictionPoolImpl));
    }

    // --- helpers ---
    function _grantData() internal pure returns (bytes memory) {
        return abi.encodeWithSelector(
            bytes4(keccak256("grantRole(bytes32,address)")),
            DEFAULT_ADMIN_ROLE,
            GRANTEE
        );
    }

    function _operationId() internal view returns (bytes32) {
        return TimelockController(payable(TIMELOCK)).hashOperation(
            PREDICTION_POOL_PROXY,
            0,
            _grantData(),
            PREDECESSOR,
            SALT
        );
    }
}

// USAGE
//
// Phase 1 — schedule (now, from deployer who holds PROPOSER_ROLE):
//   forge script script/upgrades/UpgradePredictionPool.s.sol:UpgradePredictionPool \
//     --sig "scheduleGrantAdmin()" --broadcast -vvv
//
// Phase 2 — execute (after 48h, from anyone — executor is open):
//   forge script script/upgrades/UpgradePredictionPool.s.sol:UpgradePredictionPool \
//     --sig "executeGrantAdmin()" --broadcast -vvv
//
// Cancel (if needed, from deployer who holds CANCELLER_ROLE):
//   forge script script/upgrades/UpgradePredictionPool.s.sol:UpgradePredictionPool \
//     --sig "cancelGrantAdmin()" --broadcast -vvv
//
// Upgrade impl (after DEFAULT_ADMIN_ROLE is granted, only if deployer also has UPGRADER_ROLE):
//   forge script script/upgrades/UpgradePredictionPool.s.sol:UpgradePredictionPool \
//     --sig "upgrade()" --broadcast -vvv
//
// Dry-run any phase by dropping --broadcast.
