import { PageTransition } from "@/components/pages/(app)";
import {
  RecentActivity,
  ReferralHeader,
  ReferralHero,
  RewardCard,
  RewardStats,
} from "@/components/pages/(referral)";

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
