"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { toast } from "sonner";
import { EmojiAvatar } from "@/components/shared";
import type { MemberResponse } from "@/lib/api/endpoints";
import { circlesApi } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";

type DetailsMembersProps = {
  circleId?: string;
};

export default function DetailsMembers({ circleId }: DetailsMembersProps) {
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!circleId) {
      setLoading(false);
      return;
    }

    circlesApi
      .members(circleId)
      .then((res) => setMembers(res.items))
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [circleId]);

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Members</p>
        <span className="text-xs text-muted">{members.length} total</span>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white divide-y divide-gray-50">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={`skel-${i}`} className="flex items-center justify-between px-4 py-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gray-100" />
                <div>
                  <div className="h-4 w-24 rounded-lg bg-gray-100 mb-1.5" />
                  <div className="h-3 w-16 rounded-lg bg-gray-100" />
                </div>
              </div>
              <div className="h-6 w-14 rounded-full bg-gray-100" />
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-10 px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-3">
            <HiOutlineUserGroup className="w-6 h-6 text-muted" />
          </div>
          <p className="text-sm font-semibold text-main-text mb-1">
            No members yet
          </p>
          <p className="text-xs text-muted text-center">
            Invite friends to join this circle
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white divide-y divide-gray-50">
          {members.map((m, i) => (
            <motion.div
              key={m.userId}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <EmojiAvatar
                  avatar={toAvatar(m.user.avatarEmoji, m.user.avatarColor)}
                  size={40}
                />
                <div>
                  <p className="text-sm font-semibold text-main-text">
                    {m.user.name || "Anonymous"}
                  </p>
                  <p className="text-xs text-muted">
                    {m.user.username
                      ? `@${m.user.username}`
                      : m.user.walletAddress.slice(0, 10)}
                  </p>
                </div>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  m.role === "admin"
                    ? "bg-brand text-white"
                    : "bg-gray-50 text-muted"
                }`}
              >
                {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {members.length > 0 && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            className="rounded-full border border-gray-100 bg-white px-6 py-2 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
          >
            View All Members
          </button>
        </div>
      )}
    </div>
  );
}
