import { ReferralHeader, ReferralHero, RewardCard, RewardStats, RecentActivity } from "@/components/pages/(referral)";
import { PageTransition } from "@/components/pages/(app)";

export default function ReferralPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-10">
      <ReferralHeader />
      <PageTransition>
        <ReferralHero />
        <RewardCard />
        <RewardStats />
        <RecentActivity />
      </PageTransition>
    </div>
  );
}
