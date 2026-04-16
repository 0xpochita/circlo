import { BottomTabBar, PageTransition } from "@/components/pages/(app)";
import {
  CirclesActions,
  CirclesHeader,
  CirclesList,
  CirclesStats,
  PendingInvites,
} from "@/components/pages/(circles)";

export default function CirclesPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-28">
      <PageTransition>
        <CirclesHeader />
        <CirclesStats />
        <PendingInvites />
        <CirclesActions />
        <CirclesList />
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}
