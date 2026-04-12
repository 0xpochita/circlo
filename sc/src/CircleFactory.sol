// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./interfaces/ICircleFactory.sol";

contract CircleFactory is Initializable, AccessControlUpgradeable, UUPSUpgradeable, ICircleFactory {
    using ECDSA for bytes32;

    bytes32 public constant PAUSER_ROLE   = keccak256("PAUSER_ROLE");
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    bytes32 private constant _DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    bytes32 private constant _INVITE_PROOF_TYPEHASH =
        keccak256("InviteProof(uint256 circleId,address invitee,uint256 expiry)");

    bytes32 private _DOMAIN_SEPARATOR;

    mapping(uint256 => Circle) public circles;
    mapping(uint256 => mapping(address => bool)) public isMember;
    mapping(uint256 => address[]) internal _members;

    uint256 public nextCircleId;

    error CircleNotFound();
    error AlreadyMember();
    error NotMember();
    error OwnerCannotLeave();
    error NotCircleOwner();
    error CircleIsPrivate();
    error InvalidProof();
    error ProofExpired();

    constructor() {
        _disableInitializers();
    }

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

    function joinCircle(uint256 circleId) external {
        Circle storage c = _requireCircle(circleId);
        if (c.isPrivate) revert CircleIsPrivate();
        if (isMember[circleId][msg.sender]) revert AlreadyMember();
        _addMember(circleId, msg.sender);
        emit CircleJoined(circleId, msg.sender);
    }

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

    function leaveCircle(uint256 circleId) external {
        _requireCircle(circleId);
        if (!isMember[circleId][msg.sender]) revert NotMember();
        if (circles[circleId].owner == msg.sender) revert OwnerCannotLeave();
        isMember[circleId][msg.sender] = false;
        emit CircleLeft(circleId, msg.sender);
    }

    function addMember(uint256 circleId, address member) external {
        _requireCircle(circleId);
        if (circles[circleId].owner != msg.sender) revert NotCircleOwner();
        if (isMember[circleId][member]) revert AlreadyMember();
        _addMember(circleId, member);
        emit MemberAdded(circleId, member);
    }

    function removeMember(uint256 circleId, address member) external {
        _requireCircle(circleId);
        if (circles[circleId].owner != msg.sender) revert NotCircleOwner();
        if (!isMember[circleId][member]) revert NotMember();
        isMember[circleId][member] = false;
        emit MemberRemoved(circleId, member);
    }

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

    function isCircleMember(uint256 circleId, address user) external view returns (bool) {
        return isMember[circleId][user];
    }

    function getCircle(uint256 circleId) external view returns (Circle memory) {
        _requireCircle(circleId);
        return circles[circleId];
    }

    function _addMember(uint256 circleId, address member) internal {
        isMember[circleId][member] = true;
        _members[circleId].push(member);
    }

    function _requireCircle(uint256 circleId) internal view returns (Circle storage c) {
        c = circles[circleId];
        if (c.createdAt == 0) revert CircleNotFound();
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(UPGRADER_ROLE) {}
}
