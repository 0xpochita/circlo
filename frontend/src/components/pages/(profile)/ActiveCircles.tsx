"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { EmojiAvatar } from "@/components/shared";
import { circlesApi } from "@/lib/api/endpoints";
import type { CircleResponse } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";

type CircleWithCount = CircleResponse & { fetchedMemberCount?: number };

export default function ActiveCircles() {
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
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-main-text">Your circles</p>
          <Link href="/create-circle" className="text-sm font-medium text-muted cursor-pointer">
            + New circle
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={`skel-${i}`} className="animate-pulse min-w-[160px] rounded-2xl bg-gray-100 h-[180px]" />
          ))}
        </div>
      </div>
    );
  }

  if (circles.length === 0) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-main-text">Your circles</p>
          <Link href="/create-circle" className="text-sm font-medium text-muted cursor-pointer">
            + New circle
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-8 px-4">
          <p className="text-sm text-muted">No circles yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Your circles</p>
        <Link href="/create-circle" className="text-sm font-medium text-muted cursor-pointer">
          + New circle
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {circles.map((c) => (
          <Link
            key={c.id}
            href={`/circle-details?id=${c.id}`}
            className="flex min-w-[160px] flex-col rounded-2xl bg-white p-1 cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <div className="flex aspect-square flex-col justify-between rounded-2xl bg-gray-50 p-3">
              <div>
                <EmojiAvatar avatar={toAvatar(c.avatarEmoji, c.avatarColor)} size={40} shape="square" />
              </div>
              <p className="text-sm text-muted">{c.name}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-2">
              <p className="text-base font-bold text-main-text inline-flex items-center gap-1">
                {c.fetchedMemberCount ?? c.memberCount ?? 1} <span className="text-xs font-normal text-muted">members</span>
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
