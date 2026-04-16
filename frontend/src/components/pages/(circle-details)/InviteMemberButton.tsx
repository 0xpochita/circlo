"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineUserPlus,
  HiXMark,
} from "react-icons/hi2";
import { toast } from "sonner";
import { EmojiAvatar } from "@/components/shared";
import { useSheetOverflow } from "@/hooks";
import { circlesApi, usersApi } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";

type SearchUser = {
  id: string;
  walletAddress: string;
  name: string | null;
  username: string | null;
  avatarEmoji: string | null;
  avatarColor: string | null;
  createdAt: string;
};

type InviteMemberButtonProps = {
  circleId?: string;
};

export default function InviteMemberButton({
  circleId,
}: InviteMemberButtonProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invited, setInvited] = useState<Record<string, boolean>>({});
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useSheetOverflow(open);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setUsers([]);
      return;
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!search.trim()) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceRef.current = setTimeout(() => {
      usersApi
        .search(search.trim())
        .then((res) => setUsers(res))
        .catch(() => setUsers([]))
        .finally(() => setIsLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  async function handleInvite(user: SearchUser) {
    if (!circleId) {
      toast.error("Circle not found");
      return;
    }
    if (!user.username) {
      toast.error("This user has no username yet");
      return;
    }

    setInvitingId(user.id);
    try {
      const res = await circlesApi.invite(circleId, [user.username]);
      if (res.invalidUsernames && res.invalidUsernames.length > 0) {
        toast.error(`Username not found: ${res.invalidUsernames.join(", ")}`);
        return;
      }
      setInvited((prev) => ({ ...prev, [user.id]: true }));
      toast.success(`Invited @${user.username}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already")) {
        setInvited((prev) => ({ ...prev, [user.id]: true }));
        toast(`@${user.username} is already a member`);
      } else {
        toast.error("Failed to send invite");
      }
    } finally {
      setInvitingId(null);
    }
  }

  return (
    <>
      <div className="px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.98]"
        >
          <HiOutlineUserPlus className="w-4 h-4" />
          Invite member
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
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
              className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 flex flex-col rounded-t-3xl bg-white"
              style={{ maxHeight: "85dvh" }}
            >
              <div className="flex items-start justify-between px-6 pt-6 pb-3 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-main-text">
                    Invite Members
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Search by username to send invites
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-95"
                >
                  <HiXMark className="w-5 h-5 text-main-text" />
                </button>
              </div>

              <div className="px-6 pb-3 shrink-0">
                <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 transition-all duration-200 focus-within:ring-2 focus-within:ring-gray-300">
                  <HiOutlineMagnifyingGlass className="w-5 h-5 text-muted" />
                  <input
                    type="text"
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by username..."
                    className="flex-1 bg-transparent text-sm text-main-text placeholder:text-muted outline-none"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 pb-8">
                {isLoading ? (
                  <div className="flex flex-col gap-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="animate-pulse rounded-2xl bg-gray-100 h-16"
                      />
                    ))}
                  </div>
                ) : !search.trim() ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                      <HiOutlineUserPlus className="w-7 h-7 text-muted" />
                    </div>
                    <p className="text-base font-semibold text-main-text mb-1">
                      Find friends to invite
                    </p>
                    <p className="text-sm text-muted text-center">
                      Type a username to start searching
                    </p>
                  </div>
                ) : users.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
                      <HiOutlineUserPlus className="w-7 h-7 text-muted" />
                    </div>
                    <p className="text-base font-semibold text-main-text mb-1">
                      No users found
                    </p>
                    <p className="text-sm text-muted text-center">
                      Try a different username
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {users.map((user, i) => {
                      const isInvited = invited[user.id];
                      const isInviting = invitingId === user.id;
                      const canInvite = !!user.username;
                      return (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: 0.04 * i }}
                          className="flex items-center justify-between rounded-2xl bg-gray-50 px-4 py-3"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <EmojiAvatar
                              avatar={toAvatar(
                                user.avatarEmoji,
                                user.avatarColor,
                              )}
                              size={40}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-main-text truncate">
                                {user.name ??
                                  user.username ??
                                  user.walletAddress.slice(0, 8)}
                              </p>
                              <p className="text-xs text-muted truncate">
                                {user.username
                                  ? `@${user.username}`
                                  : user.walletAddress.slice(0, 12)}
                              </p>
                            </div>
                          </div>
                          {isInvited ? (
                            <span className="shrink-0 rounded-full bg-white px-4 py-1.5 text-xs text-muted">
                              Invited
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleInvite(user)}
                              disabled={isInviting || !canInvite}
                              className="shrink-0 rounded-full bg-gray-900 px-4 py-1.5 text-xs font-medium text-white cursor-pointer transition-all duration-200 active:scale-95 disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
                            >
                              {isInviting ? "..." : "Invite"}
                            </button>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
