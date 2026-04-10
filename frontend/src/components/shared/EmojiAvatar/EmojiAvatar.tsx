"use client";

import type { UserAvatar } from "@/types";

type EmojiAvatarProps = {
  avatar: UserAvatar;
  size?: number;
  className?: string;
};

export default function EmojiAvatar({ avatar, size = 40, className = "" }: EmojiAvatarProps) {
  const fontSize = size * 0.55;

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${className}`}
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
