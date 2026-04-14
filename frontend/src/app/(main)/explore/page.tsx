"use client";

import { useState } from "react";
import { ExploreHeader, SearchCircle, InviteCodeInput, CategoryTabs, CircleList } from "@/components/pages/(explore)";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";

const categories = [
  { label: "All", emoji: "✨", value: "" },
  { label: "Crypto", emoji: "💎", value: "crypto" },
  { label: "Fitness", emoji: "⚡", value: "fitness" },
  { label: "Gaming", emoji: "🎮", value: "gaming" },
  { label: "Global", emoji: "🌈", value: "other" },
  { label: "Music", emoji: "🎧", value: "music" },
];

export default function ExplorePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-28">
      <PageTransition>
        <ExploreHeader />
        <div className="px-4 py-2">
          <h2 className="text-xl font-bold text-main-text">Find new circles</h2>
          <p className="mt-1 text-sm text-muted">Join circles that match your interest</p>
        </div>
        <SearchCircle value={search} onChange={setSearch} />
        <InviteCodeInput />
        <CategoryTabs
          categories={categories}
          selected={category}
          onSelect={setCategory}
        />
        <CircleList search={search} category={category} />
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}
