"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { HiCheck, HiOutlineShieldCheck } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared";
import { useCreateGoalStore } from "@/stores/createGoalStore";
import { circlesApi } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";
import type { UserAvatar } from "@/types";

type Member = {
  userId: string;
  displayName: string;
  username: string;
  avatar: UserAvatar;
};

export default function ResolverPicker() {
  const store = useCreateGoalStore();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!store.circleId) return;
    setIsLoading(true);
    circlesApi
      .members(store.circleId)
      .then((res) => {
        setMembers(
          res.items.map((m) => ({
            userId: m.userId,
            displayName: m.user.name || "Member",
            username: m.user.username ? `@${m.user.username}` : m.user.walletAddress.slice(0, 10),
            avatar: toAvatar(m.user.avatarEmoji, m.user.avatarColor),
          }))
        );
      })
      .catch(() => setMembers([]))
      .finally(() => setIsLoading(false));
  }, [store.circleId]);

  function toggle(userId: string) {
    const next = store.resolvers.includes(userId)
      ? store.resolvers.filter((w) => w !== userId)
      : [...store.resolvers, userId];
    store.setResolvers(next);
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl bg-white p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
            <HiOutlineShieldCheck className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-main-text">Pick your trusted friends</p>
            <p className="text-xs text-muted mt-0.5">Loading circle members...</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="animate-pulse rounded-xl bg-gray-100 h-14" />
          ))}
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
            <HiOutlineShieldCheck className="w-5 h-5 text-brand" />
          </div>
          <div>
            <p className="text-sm font-semibold text-main-text">Pick your trusted friends</p>
            <p className="text-xs text-muted mt-0.5">
              {store.circleId ? "No members found in this circle" : "Select a circle first"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
          <HiOutlineShieldCheck className="w-5 h-5 text-brand" />
        </div>
        <div>
          <p className="text-sm font-semibold text-main-text">Pick your trusted friends</p>
          <p className="text-xs text-muted mt-0.5">
            They&apos;ll decide if this goal was reached when it&apos;s time to resolve
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {members.map((member) => {
          const isSelected = store.resolvers.includes(member.userId);
          return (
            <motion.button
              type="button"
              key={member.userId}
              onClick={() => toggle(member.userId)}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                isSelected ? "bg-brand-light ring-2 ring-main-text" : "bg-gray-50"
              }`}
            >
              <EmojiAvatar avatar={member.avatar} size={36} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-main-text">{member.displayName}</p>
                <p className="text-xs text-muted">{member.username}</p>
              </div>
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                  isSelected ? "bg-main-text" : "border-2 border-gray-200"
                }`}
              >
                {isSelected && <HiCheck className="w-4 h-4 text-white" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted">
        {store.resolvers.length} of {members.length} selected
      </p>
    </div>
  );
}
