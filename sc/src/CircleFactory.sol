// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/ICircleFactory.sol";

/// @title CircleFactory
/// @notice Authoritative registry for Circlo circles + membership.
/// @dev UUPS upgradeable. The only contract that mutates membership
///      state — PredictionPool, ResolutionModule, and off-chain
///      indexers all read membership via `isCircleMember`.
///
///      Private-circle joins use an EIP-712 `InviteProof` signed by the
///      circle owner off-chain; see `joinCirclePrivate` for the encoded
///      bytes layout.
contract CircleFactory is Initializable, AccessControlUpgradeable, UUPSUpgradeable, ICircleFactory {
    using ECDSA for bytes32;

    /// @notice Role allowed to pause future entrypoints (reserved for v2).
    bytes32 public constant PAUSER_ROLE   = keccak256("PAUSER_ROLE");
    /// @notice Role allowed to authorize UUPS upgrades.
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    /// @dev EIP-712 domain separator type hash. Standard form, never
    ///      changes per chain — `_DOMAIN_SEPARATOR` is derived from it.
    bytes32 private constant _DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    /// @dev Type hash for the InviteProof struct used by joinCirclePrivate.
    ///      Must stay byte-identical to the off-chain signer's hash or
    ///      EIP-712 recovery breaks.
    bytes32 private constant _INVITE_PROOF_TYPEHASH =
        keccak256("InviteProof(uint256 circleId,address invitee,uint256 expiry)");

    /// @dev Cached domain separator — derived from _DOMAIN_TYPEHASH at
    ///      initialize time and reused for every EIP-712 verification.
    ///      Includes chainId so a signature from a different chain can't
    ///      replay here.
    bytes32 private _DOMAIN_SEPARATOR;

    /// @notice circleId → Circle struct (owner, isPrivate, createdAt, metadataURI).
    mapping(uint256 => Circle) public circles;
    /// @notice circleId → member → membership flag. The canonical
    ///         membership check for the whole Circlo system.
    mapping(uint256 => mapping(address => bool)) public isMember;
    /// @notice circleId → append-only member array used by `getMembers`.
    /// @dev Internal because `getMembers` exposes a paginated view.
    ///      Members are never removed from this array (the flag mapping
    ///      tracks live membership); iteration consumers must filter on
    ///      `isMember` if they need only-current.
    mapping(uint256 => address[]) internal _members;

    /// @notice Next id to assign on `createCircle`. Monotonically increasing.
    uint256 public nextCircleId;

    /// @notice Thrown when an action targets a circleId that was never created.
    error CircleNotFound();
    /// @notice Thrown when a join is attempted by someone already a member.
    error AlreadyMember();
    /// @notice Thrown when a leave/remove is attempted on a non-member.
    error NotMember();
    /// @notice Thrown when a circle owner tries to leave their own circle.
    error OwnerCannotLeave();
    /// @notice Thrown when a non-owner calls an owner-only method.
    error NotCircleOwner();
    /// @notice Thrown when `joinCircle` is called on a private circle.
    error CircleIsPrivate();
    /// @notice Thrown when an inviteProof signature doesn't recover to the owner.
    error InvalidProof();
    /// @notice Thrown when an inviteProof's expiry has passed.
    error ProofExpired();

    constructor() {
        _disableInitializers();
    }

    /// @notice One-shot initializer for the UUPS proxy.
    /// @dev MUST be called once immediately after proxy deployment.
    ///      Computes the EIP-712 domain separator from name="Circlo",
    ///      version="1", current chainId, and this proxy's address.
    ///      Off-chain signers MUST construct the domain with these same
    ///      values or InviteProof signatures won't verify.
    /// @param admin Address granted DEFAULT_ADMIN_ROLE.
    function initialize(address admin) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, admin);

        _DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                _DOMAIN_TYPEHASH,
                keccak256(bytes("Circlo")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Create a new circle. The creator becomes owner + auto-member.
    /// @dev Permissionless — anyone can create a circle. circleId is the
    ///      current nextCircleId, which is post-incremented after assignment.
    ///      Note: id `0` is a valid circle id (first circle has id=0); never
    ///      treat `circleId == 0` as "no circle" — use `createdAt == 0` check
    ///      instead (that's what `_requireCircle` does).
    /// @param isPrivate True for invite-only circles (requires EIP-712 inviteProof to join).
    /// @param metadataURI Off-chain JSON metadata (name, description, avatar, etc).
    /// @return circleId Sequential id assigned to the new circle.
    function createCircle(bool isPrivate, string calldata metadataURI)
        external
        returns (uint256 circleId)
    {
        circleId = nextCircleId++;
        circles[circleId] = Circle({
            owner: msg.sender,
            isPrivate: isPrivate,
            createdAt: uint64(block.timestamp),
            metadataURI: metadataURI
        });
        _addMember(circleId, msg.sender);
        emit CircleCreated(circleId, msg.sender, isPrivate, metadataURI);
    }

    /// @notice Join a public circle as a new member.
    /// @dev Permissionless for public circles; reverts for private ones
    ///      (use `joinCirclePrivate` with a signed InviteProof instead).
    ///      Reverts:
    ///        - CircleNotFound if circleId was never created
    ///        - CircleIsPrivate if the circle is invite-only
    ///        - AlreadyMember if msg.sender is already a member
    /// @param circleId Circle to join.
    function joinCircle(uint256 circleId) external {
        Circle storage c = _requireCircle(circleId);
        if (c.isPrivate) revert CircleIsPrivate();
        if (isMember[circleId][msg.sender]) revert AlreadyMember();
        _addMember(circleId, msg.sender);
        emit CircleJoined(circleId, msg.sender);
    }

    /// @notice Join a private circle using an EIP-712 InviteProof from the owner.
    /// @dev inviteProof encodes `(bytes signature, uint256 expiry)` via
    ///      abi.encode. The signature must be over the EIP-712 digest of
    ///      `InviteProof(circleId, msg.sender, expiry)` using this
    ///      contract's domain separator.
    ///
    ///      The invitee address is bound INTO the signed payload, so a
    ///      proof signed for Alice can't be replayed by Bob.
    ///
    ///      Reverts:
    ///        - CircleNotFound if circleId was never created
    ///        - AlreadyMember if msg.sender is already a member
    ///        - ProofExpired if `expiry < block.timestamp`
    ///        - InvalidProof if signer != circle owner
    /// @param circleId Circle to join.
    /// @param inviteProof ABI-encoded (bytes sig, uint256 expiry).
    function joinCirclePrivate(uint256 circleId, bytes calldata inviteProof) external {
        _requireCircle(circleId);
        if (isMember[circleId][msg.sender]) revert AlreadyMember();

        (bytes memory sig, uint256 expiry) = abi.decode(inviteProof, (bytes, uint256));
        if (block.timestamp > expiry) revert ProofExpired();

        bytes32 structHash = keccak256(
            abi.encode(_INVITE_PROOF_TYPEHASH, circleId, msg.sender, expiry)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, structHash));
        address signer = ECDSA.recover(digest, sig);

        if (signer != circles[circleId].owner) revert InvalidProof();

        _addMember(circleId, msg.sender);
        emit CircleJoined(circleId, msg.sender);
    }

    /// @notice Leave a circle the caller is currently a member of.
    /// @dev Owners cannot leave their own circle (would orphan the circle
    ///      and break invariants downstream — PredictionPool reads the
    ///      owner address for fee defaults). Owners must transfer
    ///      ownership first (transfer flow is reserved for v2).
    ///
    ///      Note: the address stays in `_members[]` (append-only); only
    ///      the `isMember` flag flips. Active stakes on goals in this
    ///      circle remain claimable per the goal lifecycle.
    /// @param circleId Circle to leave.
    function leaveCircle(uint256 circleId) external {
        _requireCircle(circleId);
        if (!isMember[circleId][msg.sender]) revert NotMember();
        if (circles[circleId].owner == msg.sender) revert OwnerCannotLeave();
        isMember[circleId][msg.sender] = false;
        emit CircleLeft(circleId, msg.sender);
    }

    /// @notice Owner-driven add: pull `member` into the circle without
    ///         requiring them to send a tx themselves.
    /// @dev Owner-only. Useful for bulk seeding or admin migrations
    ///      where the owner already has off-chain consent. Distinct
    ///      from `joinCircle` (which msg.sender pays gas for themselves)
    ///      and `joinCirclePrivate` (which requires a signed proof).
    /// @param circleId Circle to add to.
    /// @param member Address to add as a member.
    function addMember(uint256 circleId, address member) external {
        _requireCircle(circleId);
        if (circles[circleId].owner != msg.sender) revert NotCircleOwner();
        if (isMember[circleId][member]) revert AlreadyMember();
        _addMember(circleId, member);
        emit MemberAdded(circleId, member);
    }

    /// @notice Owner-driven kick: remove `member` from the circle.
    /// @dev Owner-only. Symmetric to addMember. Owner CAN remove themselves
    ///      via this function (no OwnerCannotLeave check here) — useful
    ///      for an owner-transfer flow where the new owner is set first,
    ///      then the old owner is kicked.
    ///
    ///      Same append-only behaviour as leaveCircle: address stays in
    ///      _members[], only isMember flag flips.
    /// @param circleId Circle to remove from.
    /// @param member Address to remove.
    function removeMember(uint256 circleId, address member) external {
        _requireCircle(circleId);
        if (circles[circleId].owner != msg.sender) revert NotCircleOwner();
        if (!isMember[circleId][member]) revert NotMember();
        isMember[circleId][member] = false;
        emit MemberRemoved(circleId, member);
    }

    /// @notice Paginated read of a circle's member list.
    /// @dev Returns a slice of the append-only _members[] array — INCLUDES
    ///      addresses that have since left or been removed. Callers that
    ///      want only-current must filter on `isCircleMember(circleId, addr)`.
    ///
    ///      offset >= total returns an empty array (not a revert) so
    ///      pagination loops can break cleanly.
    /// @param circleId Circle to read.
    /// @param offset Starting index into the (append-only) member array.
    /// @param limit Max number of addresses to return.
    /// @return members Address slice of size min(limit, total - offset).
    function getMembers(uint256 circleId, uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory members)
    {
        address[] storage all = _members[circleId];
        uint256 total = all.length;
        if (offset >= total) return new address[](0);
        uint256 end = offset + limit;
        if (end > total) end = total;
        uint256 size = end - offset;
        members = new address[](size);
        for (uint256 i = 0; i < size; i++) {
            members[i] = all[offset + i];
        }
    }

    /// @notice Canonical membership check used across the Circlo system.
    /// @dev Single-call lookup; PredictionPool.createGoal/stake gates on
    ///      this exact function. Indexers + UI gating should prefer this
    ///      over re-implementing the check off-chain.
    ///
    ///      Does NOT validate that circleId exists — returns false for
    ///      non-existent circles (no revert). Callers needing existence
    ///      should use `getCircle` instead.
    /// @param circleId Circle to check.
    /// @param user Address to test.
    /// @return True if `user` is currently a member of `circleId`.
    function isCircleMember(uint256 circleId, address user) external view returns (bool) {
        return isMember[circleId][user];
    }

    /// @notice Read the full Circle struct (owner, isPrivate, createdAt, metadataURI).
    /// @dev Reverts CircleNotFound if circleId was never created.
    ///      Use this when you need the metadata + owner info; for
    ///      membership-only checks prefer `isCircleMember` (skips revert).
    /// @param circleId Circle to read.
    /// @return Full Circle struct.
    function getCircle(uint256 circleId) external view returns (Circle memory) {
        _requireCircle(circleId);
        return circles[circleId];
    }

    /// @dev Shared add-member primitive used by `createCircle`,
    ///      `joinCircle`, `joinCirclePrivate`, and `addMember`. Both
    ///      side effects (isMember flag + _members array push) MUST
    ///      stay in lockstep so off-chain pagination via `getMembers`
    ///      mirrors the on-chain membership truth.
    /// @param circleId Circle being joined.
    /// @param member Address being added as a member.
    function _addMember(uint256 circleId, address member) internal {
        isMember[circleId][member] = true;
        _members[circleId].push(member);
    }

    /// @dev Internal guard that loads a circle storage pointer and
    ///      reverts CircleNotFound if the circle was never created.
    ///      Used by every membership-mutating method as the first
    ///      step before any state change.
    /// @param circleId Circle to look up.
    /// @return c Storage pointer to the circle (caller may read/write).
    function _requireCircle(uint256 circleId) internal view returns (Circle storage c) {
        c = circles[circleId];
        if (c.createdAt == 0) revert CircleNotFound();
    }

    /// @dev UUPS hook — restricts upgrades to UPGRADER_ROLE holders
    ///      (today the TimelockController on Celo Mainnet, which
    ///      enforces a 48h delay before any new implementation can
    ///      be installed). Empty body is the standard OZ pattern.
    /// @param newImplementation New CircleFactory implementation address.
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
