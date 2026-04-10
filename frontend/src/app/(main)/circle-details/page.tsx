import { DetailsHeader, DetailsHero, DetailsStats, DetailsGoals, DetailsMembers, JoinButton } from "@/components/pages/(circle-details)";
import { PageTransition } from "@/components/pages/(app)";

export default function CircleDetailsPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
      <DetailsHeader />
      <PageTransition>
        <DetailsHero />
        <DetailsStats />
        <DetailsGoals />
        <DetailsMembers />
      </PageTransition>
      <JoinButton />
    </div>
  );
}
