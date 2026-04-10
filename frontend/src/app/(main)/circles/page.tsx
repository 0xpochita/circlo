import { CirclesHeader, CirclesStats, CirclesActions, CirclesList } from "@/components/pages/(circles)";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";

export default function CirclesPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-28">
      <PageTransition>
        <CirclesHeader />
        <CirclesStats />
        <CirclesActions />
        <CirclesList />
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}
