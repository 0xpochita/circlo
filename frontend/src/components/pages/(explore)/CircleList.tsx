"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { HiOutlineUserGroup } from "react-icons/hi2";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { EmojiAvatar } from "@/components/shared";
import type { CircleResponse } from "@/lib/api/endpoints";
import { circlesApi } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";

type CircleListProps = {
  search?: string;
  category?: string;
};

export default function CircleList({
  search = "",
  category = "",
}: CircleListProps) {
  const [circles, setCircles] = useState<CircleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const { isConnected } = useAccount();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    setIsLoading(true);
    debounceRef.current = setTimeout(
      () => {
        circlesApi
          .public(category || undefined, search.trim() || undefined)
          .then((res) => setCircles(res.items || []))
          .catch(() => setCircles([]))
          .finally(() => setIsLoading(false));
      },
      search ? 300 : 0,
    );

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, category]);

  async function handleJoin(e: React.MouseEvent, circleId: string) {
    e.preventDefault();
    e.stopPropagation();

    if (!isConnected) {
      toast("Connect your wallet first");
      return;
    }

    if (joined[circleId]) return;

    setJoiningId(circleId);
    try {
      await circlesApi.join(circleId);
      setJoined((prev) => ({ ...prev, [circleId]: true }));
      toast.success("Joined circle!");
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("already")) {
        setJoined((prev) => ({ ...prev, [circleId]: true }));
        toast("You're already a member");
      } else {
        toast.error("Failed to join circle");
      }
    } finally {
      setJoiningId(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3 px-4 py-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={`skel-${i}`}
            className="animate-pulse rounded-2xl bg-white p-2 flex items-center gap-3"
          >
            <div
              className="h-13 w-13 rounded-2xl bg-gray-100 shrink-0"
              style={{ width: 52, height: 52 }}
            />
            <div className="flex-1">
              <div className="h-4 w-32 rounded-lg bg-gray-100 mb-2" />
              <div className="h-3 w-48 rounded-lg bg-gray-100 mb-1.5" />
              <div className="h-3 w-20 rounded-lg bg-gray-100" />
            </div>
            <div className="h-7 w-14 rounded-full bg-gray-100 shrink-0" />
          </div>
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
          <p className="text-base font-semibold text-main-text mb-1">
            {search ? "No circles found" : "No circles to explore"}
          </p>
          <p className="text-sm text-muted text-center">
            {search
              ? "Try a different search term"
              : "Check back later for new public circles"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {circles.map((circle, i) => {
        const isJoined = joined[circle.id];
        const isJoining = joiningId === circle.id;

        return (
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
              <EmojiAvatar
                avatar={toAvatar(circle.avatarEmoji, circle.avatarColor)}
                size={52}
                shape="square"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-main-text truncate">
                  {circle.name}
                </p>
                <p className="text-xs text-muted truncate">
                  {circle.description || "No description"}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <HiOutlineUserGroup className="w-3.5 h-3.5 text-muted" />
                  <span className="text-xs text-muted">
                    {circle.memberCount || 0} members
                  </span>
                </div>
              </div>
              {isJoined ? (
                <span className="shrink-0 rounded-full bg-gray-50 px-4 py-1.5 text-xs text-muted">
                  Joined
                </span>
              ) : (
                <button
                  type="button"
                  disabled={isJoining}
                  onClick={(e) => handleJoin(e, circle.id)}
                  className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white cursor-pointer transition-all duration-200 active:scale-[0.95] disabled:bg-gray-200 disabled:text-muted"
                >
                  {isJoining ? "..." : "Join"}
                </button>
              )}
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
