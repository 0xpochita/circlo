"use client";

import { memo } from "react";
import type { UserAvatar } from "@/types";

type EmojiAvatarProps = {
  avatar: UserAvatar;
  size?: number;
  className?: string;
  shape?: "circle" | "square";
};

function EmojiAvatar({
  avatar,
  size = 40,
  className = "",
  shape = "circle",
}: EmojiAvatarProps) {
  const fontSize = size * 0.55;
  const roundedClass = shape === "square" ? "rounded-2xl" : "rounded-full";

  return (
    <div
      className={`flex shrink-0 items-center justify-center ${roundedClass} ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: avatar.color,
        fontSize,
        lineHeight: 1,
      }}
    >
      <span>{avatar.emoji}</span>
    </div>
  );
}

export default memo(EmojiAvatar);
