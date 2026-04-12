import { ExploreHeader, SearchCircle, InviteCodeInput, CategoryTabs, CircleList } from "@/components/pages/(explore)";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";

export default function ExplorePage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-28">
      <PageTransition>
        <ExploreHeader />
        <div className="px-4 py-2">
          <h2 className="text-xl font-bold text-main-text">Find new circles</h2>
          <p className="mt-1 text-sm text-muted">Join circles that match your interest</p>
        </div>
        <SearchCircle />
        <InviteCodeInput />
        <CategoryTabs />
        <CircleList />
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}
