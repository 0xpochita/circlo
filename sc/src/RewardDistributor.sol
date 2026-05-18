// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title RewardDistributor
/// @notice Holds + dispenses referral and retention bonuses, paid in
///         the configured reward token (USDT on Celo Mainnet).
/// @dev UUPS upgradeable. Referral / retention claim logic is stubbed
///      (`NotImplemented`) in the v1 release — the contract is deployed
///      so the address is stable, but mechanism details are being
///      finalized off-chain before the corresponding logic ships.
///      Currently the only live entrypoint is `depositRewards`, which
///      operators use to top up the reward pool.
contract RewardDistributor is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    /// @notice Role allowed to authorize UUPS upgrades of this contract.
    bytes32 public constant UPGRADER_ROLE  = keccak256("UPGRADER_ROLE");
    /// @notice Role allowed to deposit rewards into the contract.
    /// @dev Granted to the backend operator address that runs the
    ///      referral payout job. Distinct from admin so operator key
    ///      compromise can't change roles.
    bytes32 public constant OPERATOR_ROLE  = keccak256("OPERATOR_ROLE");

    /// @notice Emitted when a referrer's reward is paid out.
    event ReferralRewarded(address indexed referrer, address indexed referee, uint256 amount);
    /// @notice Emitted when a user claims their retention bonus.
    event RetentionBonusClaimed(address indexed user, uint256 amount);
    /// @notice Emitted on each operator top-up of the reward pool.
    event RewardsDeposited(uint256 amount);

    /// @notice ERC20 token the contract holds + pays out (USDT on Celo Mainnet).
    IERC20 public rewardToken;

    /// @notice Tracks whether a given referrer has claimed (one-shot per address).
    mapping(address => bool)    public referralClaimed;
    /// @notice Monotonic per-user nonce used to invalidate retention signatures.
    mapping(address => uint256) public retentionNonce;
    /// @notice Pending referral reward balance per referrer address.
    mapping(address => uint256) public pendingReferralReward;
    /// @notice Tracks whether a given user has claimed retention bonus.
    mapping(address => bool)    public retentionClaimed;

    /// @notice Default referral payout amount (referrer's cut).
    uint256 public referralRewardAmount;
    /// @notice Default retention bonus amount per qualifying user.
    uint256 public retentionBonusAmount;
    /// @notice Running total of all rewards ever deposited (audit field).
    uint256 public totalDeposited;

    /// @notice Stub error for not-yet-implemented claim methods (v1 placeholder).
    error NotImplemented();
    /// @notice Thrown when a zero address is passed where a real address is required.
    error ZeroAddress();

    constructor() {
        _disableInitializers();
    }

    /// @notice One-shot initializer for the UUPS proxy.
    /// @dev Both addresses are checked for non-zero — the contract is
    ///      unusable without either (no token to pay, no admin to grant
    ///      operator role). Re-entrancy guard is initialized here too
    ///      so `nonReentrant` works on the claim methods later.
    /// @param _rewardToken Address of the ERC20 used for payouts (USDT on Celo Mainnet).
    /// @param admin Address granted DEFAULT_ADMIN_ROLE (controls role grants).
    function initialize(address _rewardToken, address admin) external initializer {
        if (_rewardToken == address(0) || admin == address(0)) revert ZeroAddress();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        rewardToken = IERC20(_rewardToken);
    }

    /// @notice Top up the reward pool by pulling ERC20 from msg.sender.
    /// @dev Operator-only. Caller MUST have approved this contract for
    ///      `amount` on the reward token first; otherwise SafeERC20
    ///      reverts. totalDeposited is bumped before the transfer for
    ///      checks-effects-interactions ordering.
    /// @param amount Reward-token base units to pull in (USDT = 6 decimals).
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
