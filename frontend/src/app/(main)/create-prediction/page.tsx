import { PredictionHeader, CircleSelector, PredictionForm, ResolverPicker, PredictionSummary, ConfirmButton } from "@/components/pages/(create-prediction)";
import { PageTransition } from "@/components/pages/(app)";

export default function CreatePredictionPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
      <PredictionHeader />
      <PageTransition>
        <CircleSelector />
        <PredictionForm />
        <div className="px-4 py-2">
          <ResolverPicker />
        </div>
        <PredictionSummary />
      </PageTransition>
      <ConfirmButton />
    </div>
  );
}
