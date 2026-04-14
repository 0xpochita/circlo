"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineUserGroup, HiOutlineLockClosed, HiOutlineGlobeAlt } from "react-icons/hi2";
import { TbTargetArrow } from "react-icons/tb";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import { circlesApi } from "@/lib/api/endpoints";
import type { CircleResponse } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";

type CircleWithCount = CircleResponse & { fetchedMemberCount?: number };

export default function CirclesList() {
  const [circles, setCircles] = useState<CircleWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    circlesApi
      .list()
      .then(async (res) => {
        const items = res.items || [];
        const withCounts = await Promise.all(
          items.map(async (c) => {
            let count = c.memberCount ?? 0;
            if (!count) {
              try {
                const membersRes = await circlesApi.members(c.id);
                count = membersRes.items?.length ?? 1;
              } catch {
                count = 1;
              }
            }
            return { ...c, fetchedMemberCount: count };
          })
        );
        setCircles(withCounts);
      })
      .catch(() => setCircles([]))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-4 py-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={`skel-${i}`} className="animate-pulse rounded-2xl bg-gray-100 h-[120px]" />
        ))}
      </div>
    );
  }

  if (circles.length === 0) {
    return (
      <div className="px-4 py-2">
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 px-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
            <HiOutlineUserGroup className="w-7 h-7 text-muted" />
          </div>
          <p className="text-base font-semibold text-main-text mb-1">No circles yet</p>
          <p className="text-sm text-muted text-center mb-4">
            Create your first circle to start predicting goals with friends
          </p>
          <Link
            href="/create-circle"
            className="rounded-full bg-brand px-5 py-2 text-sm font-medium text-white cursor-pointer"
          >
            Create Circle
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {circles.map((circle, i) => (
        <motion.div
          key={circle.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 * i }}
        >
          <Link
            href={`/circle-details?id=${circle.id}`}
            className="flex flex-col rounded-2xl bg-white p-4 cursor-pointer transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <EmojiAvatar avatar={toAvatar(circle.avatarEmoji, circle.avatarColor)} size={48} shape="square" />
                <div>
                  <p className="text-base font-bold text-main-text">{circle.name}</p>
                  <p className="text-xs text-muted">{circle.description || "No description"}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 rounded-full bg-gray-50 px-2.5 py-1">
                {circle.privacy === "private" ? (
                  <HiOutlineLockClosed className="w-3 h-3 text-muted" />
                ) : (
                  <HiOutlineGlobeAlt className="w-3 h-3 text-muted" />
                )}
                <span className="text-[10px] font-medium text-muted capitalize">
                  {circle.privacy}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-gray-50 pt-3">
              <div className="flex items-center gap-1.5">
                <HiOutlineUserGroup className="w-4 h-4 text-muted" />
                <span className="text-xs text-muted">
                  {circle.fetchedMemberCount ?? circle.memberCount ?? 1} members
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <TbTargetArrow className="w-4 h-4 text-muted" />
                <span className="text-xs text-muted">{circle.category}</span>
              </div>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
