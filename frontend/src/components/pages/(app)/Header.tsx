"use client";

import Image from "next/image";

export default function Header() {
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
      <Image
        src="/Assets/Images/Avatar/avatar_ios.jpeg"
        alt="Profile"
        width={44}
        height={44}
        className="rounded-full object-cover cursor-pointer"
      />
    </div>
  );
}
