"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  HiOutlineEnvelope,
  HiOutlineUserGroup,
  HiXMark,
} from "react-icons/hi2";
import { toast } from "sonner";
import { EmojiAvatar } from "@/components/shared";
import { useSheetOverflow } from "@/hooks";
import type { CircleResponse } from "@/lib/api/endpoints";
import { circlesApi, notificationsApi } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";
import { useDataCache } from "@/stores/dataCache";

type Invite = {
  notificationId: string;
  circleId: string;
  circleName: string;
  description: string;
  createdAt: string;
  avatarEmoji: string | null;
  avatarColor: string | null;
  memberCount: number | null;
  privacy: string | null;
};

export default function PendingInvites() {
  const router = useRouter();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const [activeInvite, setActiveInvite] = useState<Invite | null>(null);
  const invalidateCache = useDataCache((s) => s.invalidate);

  useSheetOverflow(activeInvite !== null);

  useEffect(() => {
    let cancelled = false;

    notificationsApi
      .list()
      .then(async (res) => {
        if (cancelled) return;
        const inviteNotifs = res.items.filter(
          (n) =>
            (n.type === "circle.invited" ||
              n.type === "circle_invite" ||
              n.type === "circle.invite") &&
            n.entityId &&
            n.unread,
        );

        if (inviteNotifs.length === 0) {
          setInvites([]);
          return;
        }

        const enriched = await Promise.all(
          inviteNotifs.map(async (n) => {
            let circleName = "a circle";
            let avatarEmoji: string | null = null;
            let avatarColor: string | null = null;
            let memberCount: number | null = null;
            let privacy: string | null = null;
            try {
              const c = (await circlesApi.detail(
                n.entityId as string,
              )) as CircleResponse;
              circleName = c?.name || circleName;
              avatarEmoji = c?.avatarEmoji ?? null;
              avatarColor = c?.avatarColor ?? null;
              memberCount = c?.memberCount ?? null;
              privacy = c?.privacy ?? null;
            } catch {}

            return {
              notificationId: n.id,
              circleId: n.entityId as string,
              circleName,
              description: n.description,
              createdAt: n.createdAt,
              avatarEmoji,
              avatarColor,
              memberCount,
              privacy,
            };
          }),
        );

        if (!cancelled) setInvites(enriched);
      })
      .catch(() => {
        if (!cancelled) setInvites([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAccept(invite: Invite) {
    setAcceptingId(invite.notificationId);
    try {
      const res = await circlesApi.acceptInvite(invite.circleId);
      if (res.alreadyMember) {
        toast(`Already a member of ${invite.circleName}`);
      } else {
        toast.success(`Joined ${invite.circleName}!`);
      }
      try {
        await notificationsApi.markRead([invite.notificationId]);
      } catch {}
      setDismissed((prev) => ({ ...prev, [invite.notificationId]: true }));
      invalidateCache("myCircles");
      setActiveInvite(null);
      router.push(`/circle-details?id=${invite.circleId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("No invitation")) {
        toast.error("Invitation no longer valid");
        setDismissed((prev) => ({ ...prev, [invite.notificationId]: true }));
        setActiveInvite(null);
      } else {
        toast.error("Failed to accept invite");
      }
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleDismiss(invite: Invite) {
    setDismissed((prev) => ({ ...prev, [invite.notificationId]: true }));
    try {
      await notificationsApi.markRead([invite.notificationId]);
    } catch {}
  }

  const visible = invites.filter((i) => !dismissed[i.notificationId]);

  if (visible.length === 0) return null;

  return (
    <>
      <div className="px-4 pt-2 pb-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-main-text">
            Pending invites ({visible.length})
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <AnimatePresence initial={false}>
            {visible.map((invite) => (
              <motion.div
                key={invite.notificationId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.25 }}
                className="flex items-center gap-3 rounded-2xl bg-emerald-50 ring-1 ring-emerald-100 p-3"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white">
                  <HiOutlineEnvelope className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-main-text truncate">
                    {invite.circleName}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {invite.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveInvite(invite)}
                  className="shrink-0 rounded-full bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white cursor-pointer transition-all duration-200 active:scale-95"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => handleDismiss(invite)}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-white cursor-pointer transition-all duration-200 active:scale-95"
                  aria-label="Dismiss invite"
                >
                  <HiXMark className="w-4 h-4 text-muted" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {activeInvite && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => acceptingId === null && setActiveInvite(null)}
              className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{
                type: "spring" as const,
                stiffness: 300,
                damping: 32,
              }}
              className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 rounded-t-3xl bg-white"
            >
              <div className="flex items-start justify-between px-6 pt-6 pb-3">
                <div>
                  <h2 className="text-xl font-bold text-main-text">
                    Accept invitation
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Review the circle before joining
                  </p>
                </div>
                {acceptingId === null && (
                  <button
                    type="button"
                    onClick={() => setActiveInvite(null)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-95"
                  >
                    <HiXMark className="w-5 h-5 text-main-text" />
                  </button>
                )}
              </div>

              <div className="px-6 pb-8">
                <div className="flex items-center gap-3 mb-5">
                  <EmojiAvatar
                    avatar={toAvatar(
                      activeInvite.avatarEmoji,
                      activeInvite.avatarColor,
                    )}
                    size={56}
                    shape="square"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-main-text truncate">
                      {activeInvite.circleName}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {activeInvite.memberCount !== null && (
                        <span className="text-xs text-muted inline-flex items-center gap-1">
                          <HiOutlineUserGroup className="w-3.5 h-3.5" />
                          {activeInvite.memberCount} members
                        </span>
                      )}
                      {activeInvite.privacy && (
                        <>
                          <span className="text-xs text-muted">·</span>
                          <span className="text-xs text-muted capitalize">
                            {activeInvite.privacy}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 mb-6">
                  <p className="text-xs text-muted mb-1">Invitation message</p>
                  <p className="text-sm text-main-text">
                    {activeInvite.description}
                  </p>
                </div>

                <motion.button
                  type="button"
                  onClick={() => handleAccept(activeInvite)}
                  disabled={acceptingId !== null}
                  whileTap={acceptingId !== null ? {} : { scale: 0.97 }}
                  className="w-full rounded-full bg-gray-900 py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
                >
                  {acceptingId === activeInvite.notificationId
                    ? "Accepting..."
                    : "Accept & Join Circle"}
                </motion.button>
                <button
                  type="button"
                  onClick={() => {
                    if (acceptingId !== null) return;
                    handleDismiss(activeInvite);
                    setActiveInvite(null);
                  }}
                  disabled={acceptingId !== null}
                  className="w-full mt-3 text-sm font-medium text-muted cursor-pointer text-center disabled:cursor-not-allowed"
                >
                  Decline invite
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
