// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract RewardDistributor is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant UPGRADER_ROLE  = keccak256("UPGRADER_ROLE");
    bytes32 public constant OPERATOR_ROLE  = keccak256("OPERATOR_ROLE");

    event ReferralRewarded(address indexed referrer, address indexed referee, uint256 amount);
    event RetentionBonusClaimed(address indexed user, uint256 amount);
    event RewardsDeposited(uint256 amount);

    IERC20 public rewardToken;

    mapping(address => bool)    public referralClaimed;
    mapping(address => uint256) public retentionNonce;
    mapping(address => uint256) public pendingReferralReward;
    mapping(address => bool)    public retentionClaimed;

    uint256 public referralRewardAmount;
    uint256 public retentionBonusAmount;
    uint256 public totalDeposited;

    error NotImplemented();
    error ZeroAddress();

    constructor() {
        _disableInitializers();
    }

    function initialize(address _rewardToken, address admin) external initializer {
        if (_rewardToken == address(0) || admin == address(0)) revert ZeroAddress();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        rewardToken = IERC20(_rewardToken);
    }

    function depositRewards(uint256 amount) external onlyRole(OPERATOR_ROLE) {
        totalDeposited += amount;
        rewardToken.safeTransferFrom(msg.sender, address(this), amount);
        emit RewardsDeposited(amount);
    }

    function claimReferral(address referrer, address referee) external nonReentrant {
        (referrer, referee);
        revert NotImplemented();
    }

    function claimRetentionBonus(address user) external nonReentrant {
        (user);
        revert NotImplemented();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
