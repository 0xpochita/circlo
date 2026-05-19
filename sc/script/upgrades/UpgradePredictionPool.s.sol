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
    function run() external {
        uint256 deployerPk = vm.envUint("PRIVATE_KEY");
        vm.createSelectFork("celo");
        vm.startBroadcast(deployerPk);
        predictionPoolImpl = new PredictionPool();
        predictionPoolProxy = PredictionPool(PREDICTION_POOL_PROXY);
        predictionPoolProxy.upgradeToAndCall(address(predictionPoolImpl), "");
        vm.stopBroadcast();
    }
}

// DRY RUN
// forge script script/upgrades/UpgradePredictionPool.s.sol:UpgradePredictionPool -vvv

// RUN
// forge script script/upgrades/UpgradePredictionPool.s.sol:UpgradePredictionPool --broadcast -vvv