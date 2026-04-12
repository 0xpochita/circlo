"use client";

import Image from "next/image";
import Header from "./Header";
import SearchBar from "./SearchBar";

export default function HomeHero() {
  return (
    <div className="relative overflow-hidden rounded-b-3xl">
      <Image
        src="/Assets/Images/Background/bg-cloud.webp"
        alt="Background"
        width={448}
        height={360}
        className="absolute inset-0 h-full w-full object-cover"
        priority
      />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-main-bg/60" />
      <div className="relative z-10 pb-4">
        <Header />
        <SearchBar />
      </div>
    </div>
  );
}
