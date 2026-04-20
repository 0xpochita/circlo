// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../../src/CircleFactory.sol";

contract CircleFactoryTest is Test {
    CircleFactory public factory;

    address public owner   = makeAddr("owner");
    address public alice   = makeAddr("alice");
    address public bob     = makeAddr("bob");
    address public charlie = makeAddr("charlie");

    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant INVITE_PROOF_TYPEHASH =
        keccak256("InviteProof(uint256 circleId,address invitee,uint256 expiry)");

    function setUp() public {
        vm.startPrank(owner);
        CircleFactory impl = new CircleFactory();
        bytes memory init  = abi.encodeCall(CircleFactory.initialize, (owner));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), init);
        factory = CircleFactory(address(proxy));
        vm.stopPrank();
    }

    function _createPublicCircle() internal returns (uint256 id) {
        vm.prank(alice);
        id = factory.createCircle(false, "ipfs://circle-meta");
    }

    function _createPrivateCircle() internal returns (uint256 id) {
        vm.prank(alice);
        id = factory.createCircle(true, "ipfs://private-meta");
    }

    function _buildInviteProof(
        uint256 ownerPk,
        address ownerAddr,
        uint256 circleId,
        address invitee,
        uint256 expiry
    ) internal view returns (bytes memory proof) {
        bytes32 domainSep = keccak256(
            abi.encode(
                DOMAIN_TYPEHASH,
                keccak256(bytes("Circlo")),
                keccak256(bytes("1")),
                block.chainid,
                address(factory)
            )
        );
        bytes32 structHash = keccak256(
            abi.encode(INVITE_PROOF_TYPEHASH, circleId, invitee, expiry)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSep, structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPk, digest);
        bytes memory sig = abi.encodePacked(r, s, v);
        proof = abi.encode(sig, expiry);
        ownerAddr;
    }

    function testCreateCircle_PublicSuccess() public {
        uint256 id = _createPublicCircle();
        assertEq(id, 0);
        ICircleFactory.Circle memory c = factory.getCircle(id);
        assertEq(c.owner, alice);
        assertFalse(c.isPrivate);
        assertEq(c.metadataURI, "ipfs://circle-meta");
        assertTrue(factory.isCircleMember(id, alice));
    }

    function testCreateCircle_PrivateSuccess() public {
        uint256 id = _createPrivateCircle();
        ICircleFactory.Circle memory c = factory.getCircle(id);
        assertTrue(c.isPrivate);
        assertEq(c.owner, alice);
    }

    function testCreateCircle_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit ICircleFactory.CircleCreated(0, alice, false, "ipfs://circle-meta");
        vm.prank(alice);
        factory.createCircle(false, "ipfs://circle-meta");
    }

    function testJoinPublicCircle_Success() public {
        uint256 id = _createPublicCircle();
        vm.prank(bob);
        factory.joinCircle(id);
        assertTrue(factory.isCircleMember(id, bob));
    }

    function testJoinPublicCircle_AlreadyMemberReverts() public {
        uint256 id = _createPublicCircle();
        vm.prank(bob);
        factory.joinCircle(id);
        vm.prank(bob);
        vm.expectRevert(CircleFactory.AlreadyMember.selector);
        factory.joinCircle(id);
    }

    function testJoinPrivateCircle_WithValidProof() public {
        uint256 ownerPk = 0xA11CE;
        address ownerAddr = vm.addr(ownerPk);

        vm.prank(ownerAddr);
        uint256 id = factory.createCircle(true, "ipfs://private");

        uint256 expiry = block.timestamp + 1 days;
        bytes memory proof = _buildInviteProof(ownerPk, ownerAddr, id, bob, expiry);

        vm.prank(bob);
        factory.joinCirclePrivate(id, proof);
        assertTrue(factory.isCircleMember(id, bob));
    }

    function testJoinPrivateCircle_WithInvalidProofReverts() public {
        uint256 ownerPk = 0xA11CE;
        address ownerAddr = vm.addr(ownerPk);
        vm.prank(ownerAddr);
        uint256 id = factory.createCircle(true, "ipfs://private");

        uint256 wrongPk = 0xBAD1;
        uint256 expiry = block.timestamp + 1 days;
        bytes memory proof = _buildInviteProof(wrongPk, vm.addr(wrongPk), id, bob, expiry);

        vm.prank(bob);
        vm.expectRevert(CircleFactory.InvalidProof.selector);
        factory.joinCirclePrivate(id, proof);
    }

    function testJoinPrivateCircle_WithExpiredProofReverts() public {
        uint256 ownerPk = 0xA11CE;
        address ownerAddr = vm.addr(ownerPk);
        vm.prank(ownerAddr);
        uint256 id = factory.createCircle(true, "ipfs://private");

        uint256 expiry = block.timestamp - 1;
        bytes memory proof = _buildInviteProof(ownerPk, ownerAddr, id, bob, expiry);

        vm.prank(bob);
        vm.expectRevert(CircleFactory.ProofExpired.selector);
        factory.joinCirclePrivate(id, proof);
    }

    function testJoinPublicCircle_OnPrivateCircleReverts() public {
        uint256 id = _createPrivateCircle();
        vm.prank(bob);
        vm.expectRevert(CircleFactory.CircleIsPrivate.selector);
        factory.joinCircle(id);
    }

    function testLeaveCircle_Success() public {
        uint256 id = _createPublicCircle();
        vm.prank(bob);
        factory.joinCircle(id);
        assertTrue(factory.isCircleMember(id, bob));
        vm.prank(bob);
        factory.leaveCircle(id);
        assertFalse(factory.isCircleMember(id, bob));
    }

    function testLeaveCircle_NotMemberReverts() public {
        uint256 id = _createPublicCircle();
        vm.prank(bob);
        vm.expectRevert(CircleFactory.NotMember.selector);
        factory.leaveCircle(id);
    }

    function testLeaveCircle_OwnerCannotLeaveReverts() public {
        uint256 id = _createPublicCircle();
        vm.prank(alice);
        vm.expectRevert(CircleFactory.OwnerCannotLeave.selector);
        factory.leaveCircle(id);
    }

    function testAddMember_ByOwnerSuccess() public {
        uint256 id = _createPublicCircle();
        vm.prank(alice);
        factory.addMember(id, bob);
        assertTrue(factory.isCircleMember(id, bob));
    }

    function testAddMember_ByNonOwnerReverts() public {
        uint256 id = _createPublicCircle();
        vm.prank(bob);
        vm.expectRevert(CircleFactory.NotCircleOwner.selector);
        factory.addMember(id, charlie);
    }

    function testRemoveMember_ByOwnerSuccess() public {
        uint256 id = _createPublicCircle();
        vm.prank(bob);
        factory.joinCircle(id);
        assertTrue(factory.isCircleMember(id, bob));
        vm.prank(alice);
        factory.removeMember(id, bob);
        assertFalse(factory.isCircleMember(id, bob));
    }

    function testRemoveMember_ByNonOwnerReverts() public {
        uint256 id = _createPublicCircle();
        vm.prank(bob);
        factory.joinCircle(id);
        vm.prank(charlie);
        vm.expectRevert(CircleFactory.NotCircleOwner.selector);
        factory.removeMember(id, bob);
    }

    function testGetMembers_Paginated() public {
        uint256 id = _createPublicCircle();
        vm.prank(bob);
        factory.joinCircle(id);
        vm.prank(charlie);
        factory.joinCircle(id);

        address[] memory all = factory.getMembers(id, 0, 10);
        assertEq(all.length, 3);
        assertEq(all[0], alice);
        assertEq(all[1], bob);
        assertEq(all[2], charlie);

        address[] memory page1 = factory.getMembers(id, 1, 1);
        assertEq(page1.length, 1);
        assertEq(page1[0], bob);

        address[] memory empty = factory.getMembers(id, 100, 5);
        assertEq(empty.length, 0);
    }

    function testIsCircleMember_TrueAndFalse() public {
        uint256 id = _createPublicCircle();
        assertTrue(factory.isCircleMember(id, alice));
        assertFalse(factory.isCircleMember(id, bob));
    }
}
