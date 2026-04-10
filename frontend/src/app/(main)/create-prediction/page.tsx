import { PredictionHeader, CircleSelector, PredictionForm, PredictionSummary, ConfirmButton } from "@/components/pages/(create-prediction)";
import { PageTransition } from "@/components/pages/(app)";

export default function CreatePredictionPage() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg">
      <PredictionHeader />
      <PageTransition>
        <CircleSelector />
        <PredictionForm />
        <PredictionSummary />
      </PageTransition>
      <ConfirmButton />
    </div>
  );
}
