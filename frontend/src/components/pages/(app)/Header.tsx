"use client";

import Image from "next/image";
import Link from "next/link";
import { useUserStore } from "@/stores/userStore";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";

export default function Header() {
  const avatar = useUserStore((s) => s.avatar);

  return (
    <div className="flex items-center justify-between px-4 pt-14 pb-2">
      <div className="flex items-center gap-3">
        <Image
          src="/Assets/Images/Logo/logo-brand/logo-brand.webp"
          alt="Circlo Logo"
          width={44}
          height={44}
          className="rounded-xl"
        />
        <div>
          <p className="text-sm text-muted">Welcome back</p>
          <h1 className="text-2xl font-bold tracking-tight text-main-text">
            Circlo
          </h1>
        </div>
      </div>
      <Link href="/profile" className="cursor-pointer">
        <EmojiAvatar avatar={avatar} size={44} />
      </Link>
    </div>
  );
}
