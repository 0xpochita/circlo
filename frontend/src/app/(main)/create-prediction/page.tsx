"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { PageTransition } from "@/components/pages/(app)";
import {
  CircleSelector,
  ConfirmButton,
  PredictionForm,
  PredictionHeader,
  PredictionSummary,
  ResolverPicker,
} from "@/components/pages/(create-prediction)";
import { useCreateGoalStore } from "@/stores/createGoalStore";

function CreatePredictionContent() {
  const searchParams = useSearchParams();
  const presetCircleId = searchParams.get("circleId");
  const setCircleId = useCreateGoalStore((s) => s.setCircleId);

  useEffect(() => {
    if (presetCircleId) {
      setCircleId(presetCircleId);
    }
  }, [presetCircleId, setCircleId]);

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

export default function CreatePredictionPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
        </div>
      }
    >
      <CreatePredictionContent />
    </Suspense>
  );
}
