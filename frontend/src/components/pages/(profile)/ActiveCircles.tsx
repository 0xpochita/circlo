"use client";

import { useState, useEffect } from "react";
import { EmojiAvatar } from "@/components/shared";
import { circlesApi } from "@/lib/api/endpoints";
import type { CircleResponse } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";
import { toast } from "sonner";

export default function ActiveCircles() {
  const [circles, setCircles] = useState<CircleResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    circlesApi
      .list()
      .then((res) => setCircles(res.items))
      .catch(() => {
        
        setCircles([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-base font-bold text-main-text">Your circles</p>
          <button type="button" className="text-sm font-medium text-muted cursor-pointer">
            + New circle
          </button>
        </div>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse min-w-[160px] rounded-2xl bg-gray-100 h-[180px]" />
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
          <button type="button" className="text-sm font-medium text-muted cursor-pointer">
            + New circle
          </button>
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
        <button type="button" className="text-sm font-medium text-muted cursor-pointer">
          + New circle
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
        {circles.map((c) => (
          <div
            key={c.id}
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
                {c.memberCount || 0} <span className="text-xs font-normal text-muted">members</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
