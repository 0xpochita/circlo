// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICircleFactory {
    struct Circle {
        address owner;
        bool isPrivate;
        uint64 createdAt;
        string metadataURI;
    }

    event CircleCreated(uint256 indexed id, address indexed owner, bool isPrivate, string metadataURI);
    event CircleJoined(uint256 indexed id, address indexed member);
    event CircleLeft(uint256 indexed id, address indexed member);
    event MemberAdded(uint256 indexed id, address indexed member);
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
