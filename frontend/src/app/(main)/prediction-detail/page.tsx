import { DetailHeader, DetailHero, OddsCard, InfoSection, ParticipantList, StakeButton } from "@/components/pages/(prediction-detail)";
import { PageTransition } from "@/components/pages/(app)";

export default function PredictionDetailPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
      <DetailHeader />
      <PageTransition>
        <DetailHero />
        <OddsCard />
        <InfoSection />
        <ParticipantList />
      </PageTransition>
      <StakeButton />
    </div>
  );
}
