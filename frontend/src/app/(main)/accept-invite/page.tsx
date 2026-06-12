"use client";

import { createCircloClient } from "circlo-sdk";
import { motion } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  HiOutlineCheck,
  HiOutlineExclamationTriangle,
  HiOutlineLockClosed,
} from "react-icons/hi2";
import { toast } from "sonner";
import { useAccount, useWalletClient } from "wagmi";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";
import { AddressLink, EmojiAvatar, UsdtLabel } from "@/components/shared";
import { type CircleDetailResponse, circlesApi } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";
import {
  encodeInviteProofForContract,
  type InviteLinkParams,
  isExpired,
  parseInviteUrl,
} from "@/lib/web3/inviteProof";
import { useAuthStore } from "@/stores/authStore";

const REDIRECT_DELAY_MS = 800;
const LS_REDIRECT_AFTER_LOGIN = "circlo-redirect-after-login";

type Status =
  | "loading"
  | "invalid-link"
  | "expired"
  | "wrong-wallet"
  | "circle-not-found"
  | "ready"
  | "joining"
  | "joined";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected } = useAccount();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { data: walletClient } = useWalletClient();
  const [circle, setCircle] = useState<CircleDetailResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const invite: InviteLinkParams | null = useMemo(
    () => parseInviteUrl(searchParams),
    [searchParams],
  );

  useEffect(() => {
    if (!invite) {
      setStatus("invalid-link");
      return;
    }
    if (isExpired(invite.expiry)) {
      setStatus("expired");
      return;
    }
    if (
      isConnected &&
      address &&
      address.toLowerCase() !== invite.invitee.toLowerCase()
    ) {
      setStatus("wrong-wallet");
      return;
    }

    circlesApi
      .detail(invite.circleId)
      .then((res) => {
        setCircle(res);
        setStatus("ready");
      })
      .catch(() => setStatus("circle-not-found"));
  }, [invite, isConnected, address]);

  async function handleAccept() {
    if (!invite || !circle || !isConnected) return;
    if (!isAuthenticated) {
      localStorage.setItem(LS_REDIRECT_AFTER_LOGIN, window.location.href);
      router.push("/welcome");
      return;
    }

    if (!walletClient) {
      toast.error("Wallet not ready — please reconnect");
      setStatus("ready");
      return;
    }

    setStatus("joining");
    try {
      const proof = encodeInviteProofForContract(
        invite.signature,
        invite.expiry,
      );
      const circlo = createCircloClient({ walletClient });
      const _hash = await circlo.joinPrivateCircle(invite.chainId, proof);

      try {
        await circlesApi.join(invite.circleId);
      } catch {}

      toast.success("Joined circle!");
      setStatus("joined");
      setTimeout(() => {
        router.push(`/circle-details?id=${invite.circleId}`);
      }, REDIRECT_DELAY_MS);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("User rejected") || message.includes("denied")) {
        toast("Transaction cancelled");
      } else if (message.includes("AlreadyMember")) {
        toast("You're already a member");
        router.push(`/circle-details?id=${invite.circleId}`);
        return;
      } else if (message.includes("InvalidProof")) {
        toast.error("This invite is no longer valid");
      } else if (message.includes("ProofExpired")) {
        toast.error("This invite has expired");
      } else {
        toast.error("Failed to join. Please try again.");
      }
      setStatus("ready");
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-safe">
      <div className="flex items-center justify-between px-4 pt-safe pb-2">
        <div className="h-9 w-9" />
        <p className="text-sm font-semibold text-main-text">Invitation</p>
        <div className="h-9 w-9" />
      </div>

      <PageTransition>
        <div className="px-4 pt-8 pb-4 flex flex-col items-center">
          {status === "loading" && (
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-white animate-pulse" />
              <p className="text-sm text-muted">Loading invitation...</p>
            </div>
          )}

          {status === "invalid-link" && (
            <ErrorCard
              icon={
                <HiOutlineExclamationTriangle className="w-7 h-7 text-red-400" />
              }
              title="Invalid invite link"
              body="This link is missing data or malformed. Ask the inviter to send a fresh one."
            />
          )}

          {status === "expired" && (
            <ErrorCard
              icon={
                <HiOutlineExclamationTriangle className="w-7 h-7 text-orange-400" />
              }
              title="This invite has expired"
              body="Ask the inviter to generate a new link."
            />
          )}

          {status === "wrong-wallet" && invite && (
            <ErrorCard
              icon={<HiOutlineLockClosed className="w-7 h-7 text-red-400" />}
              title="Different wallet expected"
              body={
                <>
                  This link is only valid for{" "}
                  <AddressLink
                    address={invite.invitee}
                    withTail
                    className="font-medium text-main-text hover:underline"
                  />
                  . Switch to that wallet to accept.
                </>
              }
            />
          )}

          {status === "circle-not-found" && (
            <ErrorCard
              icon={
                <HiOutlineExclamationTriangle className="w-7 h-7 text-red-400" />
              }
              title="Circle not found"
              body="The circle might have been removed."
            />
          )}

          {(status === "ready" ||
            status === "joining" ||
            status === "joined") &&
            circle && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex flex-col items-center"
              >
                <EmojiAvatar
                  avatar={toAvatar(circle.avatarEmoji, circle.avatarColor)}
                  size={72}
                />
                <p className="mt-4 text-xl font-bold text-main-text text-center">
                  You're invited to
                </p>
                <p className="mt-1 text-2xl font-bold text-main-text text-center">
                  {circle.name}
                </p>
                {circle.description && (
                  <p className="mt-2 text-sm text-muted text-center max-w-xs">
                    {circle.description}
                  </p>
                )}

                <div className="mt-6 grid grid-cols-2 gap-3 w-full">
                  <div className="rounded-2xl bg-white p-4 text-center">
                    <p className="text-xs text-muted">Members</p>
                    <p className="mt-0.5 text-xl font-bold text-main-text">
                      {circle.memberCount ?? circle.membersPreview?.length ?? 0}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 text-center">
                    <p className="text-xs text-muted">Privacy</p>
                    <p className="mt-0.5 text-xl font-bold text-main-text capitalize">
                      {circle.privacy}
                    </p>
                  </div>
                </div>

                {status === "joined" ? (
                  <div className="mt-8 inline-flex items-center gap-2 text-emerald-500 font-medium">
                    <HiOutlineCheck className="w-5 h-5" />
                    Joined! Redirecting...
                  </div>
                ) : (
                  <motion.button
                    type="button"
                    onClick={handleAccept}
                    disabled={status === "joining" || !isConnected}
                    whileTap={status === "joining" ? {} : { scale: 0.97 }}
                    className="mt-8 w-full rounded-full bg-gray-900 py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {status === "joining"
                      ? "Joining..."
                      : !isConnected
                        ? "Connect wallet to accept"
                        : "Accept invitation"}
                  </motion.button>
                )}

                <p className="mt-3 text-xs text-muted text-center px-4">
                  <UsdtLabel size={10} /> stakes happen later. This step is just
                  joining — small gas fee on Celo.
                </p>
              </motion.div>
            )}
        </div>
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}

function ErrorCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <div className="mt-8 w-full flex flex-col items-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white mb-4">
        {icon}
      </div>
      <p className="text-base font-semibold text-main-text mb-1">{title}</p>
      <p className="text-sm text-muted max-w-xs">{body}</p>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}
