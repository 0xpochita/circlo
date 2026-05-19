// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ICircleFactory
/// @notice External interface for CircleFactory — the source of truth
///         for circle existence + membership across the Circlo system.
/// @dev PredictionPool, ResolutionModule, and off-chain indexers all
///      consume this interface. Implementers can mock it for testing.
interface ICircleFactory {
    /// @notice On-chain shape of a circle.
    /// @dev `metadataURI` is a JSON blob (name, description, avatar, etc).
    struct Circle {
        /// @notice Address that created the circle and holds owner rights.
        address owner;
        /// @notice True for invite-only circles (requires EIP-712 inviteProof to join).
        bool isPrivate;
        /// @notice Block timestamp when the circle was created.
        ///         Doubles as a "circle exists" sentinel (0 = never created).
        uint64 createdAt;
        /// @notice Off-chain metadata JSON URI/blob.
        string metadataURI;
    }

    /// @notice Emitted when a new circle is created.
    event CircleCreated(uint256 indexed id, address indexed owner, bool isPrivate, string metadataURI);
    /// @notice Emitted when an address joins a circle (public or private path).
    event CircleJoined(uint256 indexed id, address indexed member);
    /// @notice Emitted when a member voluntarily leaves a circle.
    event CircleLeft(uint256 indexed id, address indexed member);
    /// @notice Emitted when the owner pulls a member in via `addMember`.
    event MemberAdded(uint256 indexed id, address indexed member);
    /// @notice Emitted when the owner kicks a member via `removeMember`.
    event MemberRemoved(uint256 indexed id, address indexed member);

    function createCircle(bool isPrivate, string calldata metadataURI) external returns (uint256 circleId);
    function joinCircle(uint256 circleId) external;
    function joinCirclePrivate(uint256 circleId, bytes calldata inviteProof) external;
    function leaveCircle(uint256 circleId) external;
    function addMember(uint256 circleId, address member) external;
    function removeMember(uint256 circleId, address member) external;
    function getMembers(uint256 circleId, uint256 offset, uint256 limit) external view returns (address[] memory members);
    function isCircleMember(uint256 circleId, address user) external view returns (bool);
    function getCircle(uint256 circleId) external view returns (Circle memory);
    function nextCircleId() external view returns (uint256);
}
