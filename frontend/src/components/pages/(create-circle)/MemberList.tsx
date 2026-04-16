"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { HiOutlineMagnifyingGlass, HiOutlineUserPlus } from "react-icons/hi2";
import { toast } from "sonner";
import { EmojiAvatar } from "@/components/shared";
import { usersApi } from "@/lib/api/endpoints";
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

export default function MemberList() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [invited, setInvited] = useState<Record<string, boolean>>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        .catch(() => {
          toast.error("Failed to search users");
          setUsers([]);
        })
        .finally(() => setIsLoading(false));
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  function handleInvite(userId: string) {
    setInvited((prev) => ({ ...prev, [userId]: true }));
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 mb-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-brand">
        <HiOutlineMagnifyingGlass className="w-5 h-5 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search friends to invite..."
          className="flex-1 bg-transparent text-sm text-main-text placeholder:text-muted outline-none"
        />
      </div>

      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl bg-gray-100 h-16"
              />
            ))}
          </motion.div>
        ) : !search.trim() || users.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 px-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
              <HiOutlineUserPlus className="w-7 h-7 text-muted" />
            </div>
            <p className="text-base font-semibold text-main-text mb-1">
              No friends found
            </p>
            <p className="text-sm text-muted text-center">
              Try a different name or username to find your friends
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-white divide-y divide-gray-50"
          >
            {users.map((member, i) => {
              const isInvited = invited[member.id];
              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                  className="flex items-center justify-between px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <EmojiAvatar
                      avatar={toAvatar(member.avatarEmoji, member.avatarColor)}
                      size={40}
                    />
                    <div>
                      <p className="text-sm font-semibold text-main-text">
                        {member.name ??
                          member.username ??
                          member.walletAddress.slice(0, 8)}
                      </p>
                      <p className="text-xs text-muted">
                        {member.username
                          ? `@${member.username}`
                          : member.walletAddress.slice(0, 12)}
                      </p>
                    </div>
                  </div>
                  {isInvited ? (
                    <span className="rounded-full bg-gray-50 px-4 py-1.5 text-xs text-muted">
                      Invited
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleInvite(member.id)}
                      className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
                    >
                      Invite
                    </button>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
