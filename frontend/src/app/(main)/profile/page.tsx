import { ProfileHero, ReferralBanner, ActiveCircles, RecentPredictions } from "@/components/pages/(profile)";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";

export default function ProfilePage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-28">
      <PageTransition>
        <ProfileHero />
        <ReferralBanner />
        <ActiveCircles />
        <RecentPredictions />
      </PageTransition>
      <BottomTabBar />
    </div>
  );
}
