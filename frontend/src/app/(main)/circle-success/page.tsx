import { SuccessHeader, SuccessHero, ActionCard, CircleStats, PredictionMarketList, MemberActivity } from "@/components/pages/(circle-success)";
import { PageTransition } from "@/components/pages/(app)";

export default function CircleSuccessPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-10">
      <SuccessHeader />
      <PageTransition>
        <SuccessHero />
        <ActionCard />
        <CircleStats />
        <PredictionMarketList />
        <MemberActivity />
      </PageTransition>
    </div>
  );
}
