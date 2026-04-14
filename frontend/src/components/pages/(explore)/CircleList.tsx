"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { useState, useEffect } from "react";
import { EmojiAvatar } from "@/components/shared";
import { circlesApi } from "@/lib/api/endpoints";
import type { CircleResponse } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";
import { toast } from "sonner";

export default function CircleList() {
  const [circles, setCircles] = useState<CircleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joined, setJoined] = useState<Record<string, boolean>>({});

  useEffect(() => {
    circlesApi
      .public()
      .then((res) => setCircles(res.items))
      .catch(() => {
        toast.error("Failed to load public circles");
        setCircles([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  function handleJoin(id: string) {
    setJoined((prev) => ({ ...prev, [id]: true }));
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-4 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse rounded-2xl bg-gray-100 h-[72px]" />
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
          <p className="text-base font-semibold text-main-text mb-1">No circles to explore</p>
          <p className="text-sm text-muted text-center">Check back later for new public circles</p>
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
            className="flex items-center gap-3 rounded-2xl bg-white p-2 cursor-pointer transition-all duration-200 active:scale-[0.98]"
          >
            <EmojiAvatar avatar={toAvatar(circle.avatarEmoji, circle.avatarColor)} size={52} shape="square" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-main-text truncate">{circle.name}</p>
              <p className="text-xs text-muted truncate">{circle.description || "No description"}</p>
              <div className="flex items-center gap-1 mt-1">
                <HiOutlineUserGroup className="w-3.5 h-3.5 text-muted" />
                <span className="text-xs text-muted">{circle.memberCount || 0} members</span>
              </div>
            </div>
            {joined[circle.id] ? (
              <span className="shrink-0 rounded-full bg-gray-50 px-4 py-1.5 text-xs text-muted">
                Joined
              </span>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  handleJoin(circle.id);
                }}
                className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
              >
                Join
              </button>
            )}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
