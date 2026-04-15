"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { HiCheck, HiChevronDown } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared";
import { circlesApi } from "@/lib/api/endpoints";
import { toAvatar } from "@/lib/utils";
import { useCreateGoalStore } from "@/stores/createGoalStore";
import type { UserAvatar } from "@/types";

type CircleOption = {
  id: string;
  chainId: string;
  name: string;
  memberCount: number;
  avatar: UserAvatar;
};

export default function CircleSelector() {
  const [open, setOpen] = useState(false);
  const [circles, setCircles] = useState<CircleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const store = useCreateGoalStore();

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
                const m = await circlesApi.members(c.id);
                count = m.items?.length ?? 1;
              } catch {
                count = 1;
              }
            }
            return {
              id: c.id,
              chainId: c.chainId || "",
              name: c.name || "Circle",
              memberCount: count,
              avatar: toAvatar(c.avatarEmoji, c.avatarColor),
            };
          }),
        );
        setCircles(withCounts);

        const state = useCreateGoalStore.getState();
        if (state.circleId) {
          const match = withCounts.find((c) => c.id === state.circleId);
          if (match) {
            useCreateGoalStore.getState().setCircleName(match.name);
            useCreateGoalStore.getState().setCircleChainId(match.chainId);
          }
        }
      })
      .catch(() => setCircles([]))
      .finally(() => setIsLoading(false));
  }, []);

  const current = circles.find((c) => c.id === store.circleId);

  function handleSelect(circle: CircleOption) {
    store.setCircleId(circle.id);
    store.setCircleChainId(circle.chainId);
    store.setCircleName(circle.name);
    setOpen(false);
  }

  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <p className="text-sm font-medium text-main-text mb-2">Select Circle</p>
        <div className="animate-pulse rounded-2xl bg-gray-100 h-16" />
      </div>
    );
  }

  if (circles.length === 0) {
    return (
      <div className="px-4 py-2">
        <p className="text-sm font-medium text-main-text mb-2">Select Circle</p>
        <div className="rounded-2xl bg-white p-4 text-center">
          <p className="text-sm text-muted">
            No circles found. Create or join a circle first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <p className="text-sm font-medium text-main-text mb-2">Select Circle</p>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-2xl bg-white p-4 cursor-pointer transition-all duration-200 active:scale-[0.98]"
      >
        <div className="flex items-center gap-3">
          <EmojiAvatar
            avatar={current?.avatar ?? { emoji: "\u{1F518}", color: "#9ca3af" }}
            size={40}
            shape="square"
          />
          <div className="text-left">
            <p className="text-sm font-semibold text-main-text">
              {current?.name ?? "Choose a circle"}
            </p>
            {current && (
              <p className="text-xs text-muted">
                {current.memberCount} members
              </p>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <HiChevronDown className="w-5 h-5 text-muted" />
        </motion.div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-2 rounded-2xl bg-white divide-y divide-gray-50">
              {circles.map((circle) => (
                <button
                  type="button"
                  key={circle.id}
                  onClick={() => handleSelect(circle)}
                  className="flex w-full items-center justify-between px-4 py-3 cursor-pointer transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <EmojiAvatar
                      avatar={circle.avatar}
                      size={36}
                      shape="square"
                    />
                    <div className="text-left">
                      <p className="text-sm text-main-text">{circle.name}</p>
                      <p className="text-xs text-muted">
                        {circle.memberCount} members
                      </p>
                    </div>
                  </div>
                  {store.circleId === circle.id && (
                    <HiCheck className="w-5 h-5 text-brand" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
