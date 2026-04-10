import { BackHeader, CircleHero, MemberList, NextButton } from "@/components/pages/(create-circle)";

export default function InviteFriendsPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
      <BackHeader />
      <div className="px-4 py-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-main-text">
          Invite your friends
        </h1>
        <p className="mt-1 text-sm text-muted">
          We&apos;ve listed few individuals based on your interest
        </p>
      </div>
      <CircleHero />
      <MemberList />
      <NextButton />
    </div>
  );
}
