"use client";

import { useState } from "react";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";
import {
  CategoryTabs,
  CircleList,
  ExploreHeader,
  type ExploreSortKey,
  InviteCodeInput,
  SearchCircle,
} from "@/components/pages/(explore)";

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
  const [sortBy, setSortBy] = useState<ExploreSortKey>("newest");

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-28">
      <PageTransition>
        <ExploreHeader sortBy={sortBy} onSortChange={setSortBy} />
        <div className="px-4 py-2">
          <h2 className="text-xl font-bold text-main-text">Find new circles</h2>
          <p className="mt-1 text-sm text-muted">
            Join circles that match your interest
          </p>
        </div>
        <SearchCircle value={search} onChange={setSearch} />
        <InviteCodeInput />
        <CategoryTabs
          categories={categories}
          selected={category}
          onSelect={setCategory}
        />
        <CircleList search={search} category={category} sortBy={sortBy} />
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}
