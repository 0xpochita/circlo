"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineAdjustmentsHorizontal, HiOutlineUserGroup } from "react-icons/hi2";
import { toast } from "sonner";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { circlesApi } from "@/lib/api/endpoints";
import type { MemberResponse } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";

type MemberActivityProps = {
  circleId?: string;
};

export default function MemberActivity({ circleId }: MemberActivityProps) {
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
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-100 bg-white cursor-pointer"
        >
          <HiOutlineAdjustmentsHorizontal className="w-4 h-4 text-main-text" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl bg-white py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand" />
        </div>
      ) : members.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-10 px-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-3">
            <HiOutlineUserGroup className="w-6 h-6 text-muted" />
          </div>
          <p className="text-sm font-semibold text-main-text mb-1">No members yet</p>
          <p className="text-xs text-muted text-center">Invite friends to join your circle</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white divide-y divide-gray-50">
          {members.map((m, i) => (
            <motion.div
              key={m.userId}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * i }}
              className="flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <EmojiAvatar avatar={toAvatar(m.user.avatarEmoji, m.user.avatarColor)} size={40} />
                <div>
                  <p className="text-sm font-semibold text-main-text">{m.user.name || "Anonymous"}</p>
                  <p className="text-xs text-muted mb-1">{m.user.username ? `@${m.user.username}` : m.user.walletAddress.slice(0, 10)}</p>
                  <span className="inline-block rounded-md px-2 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-500">
                    Joined
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-main-text capitalize">{m.role}</p>
                <p className="text-xs text-muted">{new Date(m.joinedAt).toLocaleDateString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {members.length > 0 && (
        <div className="flex justify-center pt-5">
          <button
            type="button"
            className="rounded-full border border-gray-100 bg-white px-6 py-2 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
          >
            View All
          </button>
        </div>
      )}
    </div>
  );
}
