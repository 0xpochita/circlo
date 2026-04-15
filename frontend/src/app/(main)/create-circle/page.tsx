import {
  BackHeader,
  CircleSetupForm,
  ContinueButton,
} from "@/components/pages/(create-circle)";

export default function CreateCirclePage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
      <BackHeader />
      <div className="px-4 py-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-main-text">
          Create your circle
        </h1>
        <p className="mt-1 text-sm text-muted">
          Set up your circle details to get started
        </p>
      </div>
      <CircleSetupForm />
      <ContinueButton />
    </div>
  );
}
