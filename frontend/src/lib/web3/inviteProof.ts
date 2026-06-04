/**
 * EIP-712 invite proofs for joining private Circlo circles.
 *
 * Flow:
 *   1. Owner signs an InviteProof (circleId, invitee, expiry) with their wallet.
 *   2. Owner encodes (signature, expiry, circleId) into a shareable URL.
 *   3. Invitee opens the URL, decodes it, and submits to
 *      CircleFactory.joinCirclePrivate(circleId, inviteProof).
 *
 * The contract verifies the signature is from the circle owner and that
 * msg.sender matches the invitee address in the signed struct.
 */

import { type Address, encodeAbiParameters, type Hex } from "viem";
import { circleFactoryContract } from "@/lib/web3/contracts";
import { NETWORK } from "@/lib/web3/network";

/**
 * EIP-712 domain separator for InviteProof signatures. Must match
 * the constants encoded in `CircleFactory._EIP712_DOMAIN_TYPEHASH` —
 * change here means a contract upgrade is required, and vice versa.
 *
 * `verifyingContract` is the per-network CircleFactory address (not
 * a per-call argument) so signatures issued on Mainnet can't be
 * replayed on Sepolia.
 */
export const INVITE_PROOF_TYPED_DATA_DOMAIN = {
  name: "Circlo",
  version: "1",
  chainId: NETWORK.id,
  verifyingContract: circleFactoryContract.address,
} as const;

/**
 * EIP-712 type definitions for the InviteProof struct.
 *
 * Field order is significant — the EIP-712 type hash is computed
 * over the canonical encoding, so reordering these fields here
 * (without a matching contract update) breaks signature verification.
 */
export const INVITE_PROOF_TYPES = {
  InviteProof: [
    { name: "circleId", type: "uint256" },
    { name: "invitee", type: "address" },
    { name: "expiry", type: "uint256" },
  ],
} as const;

export type InviteProofMessage = {
  circleId: bigint;
  invitee: Address;
  expiry: bigint;
};

/**
 * Encode the (signature, expiry) pair the way CircleFactory.joinCirclePrivate
 * expects — abi.encode(bytes,uint256).
 */
export function encodeInviteProofForContract(
  signature: Hex,
  expiry: bigint,
): Hex {
  return encodeAbiParameters(
    [
      { name: "sig", type: "bytes" },
      { name: "expiry", type: "uint256" },
    ],
    [signature, expiry],
  );
}

/**
 * Build a shareable URL that the invitee can open to claim the invitation.
 * The URL contains the circle id (backend uuid), the on-chain circleId,
 * invitee address, expiry, and signature — all reconstructable by the recipient.
 */
export interface InviteLinkParams {
  /** Backend UUID of the circle (for fetching display info). */
  circleId: string;
  /** On-chain circle id. */
  chainId: bigint;
  invitee: Address;
  /** Unix seconds. */
  expiry: bigint;
  signature: Hex;
}

export function buildInviteUrl(
  params: InviteLinkParams,
  origin: string,
): string {
  const url = new URL("/accept-invite", origin);
  url.searchParams.set("id", params.circleId);
  url.searchParams.set("chainId", params.chainId.toString());
  url.searchParams.set("invitee", params.invitee);
  url.searchParams.set("expiry", params.expiry.toString());
  url.searchParams.set("sig", params.signature);
  return url.toString();
}

export function parseInviteUrl(
  search: URLSearchParams,
): InviteLinkParams | null {
  const id = search.get("id");
  const chainId = search.get("chainId");
  const invitee = search.get("invitee");
  const expiry = search.get("expiry");
  const sig = search.get("sig");

  if (!id || !chainId || !invitee || !expiry || !sig) return null;
  if (!/^0x[a-fA-F0-9]{40}$/.test(invitee)) return null;
  if (!/^0x[a-fA-F0-9]+$/.test(sig)) return null;

  try {
    return {
      circleId: id,
      chainId: BigInt(chainId),
      invitee: invitee as Address,
      expiry: BigInt(expiry),
      signature: sig as Hex,
    };
  } catch {
    return null;
  }
}

export function isExpired(expiry: bigint): boolean {
  return BigInt(Math.floor(Date.now() / 1000)) > expiry;
}
