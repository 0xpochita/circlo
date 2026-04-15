"use client";

import { useEffect, useState } from "react";
import { circlesApi } from "@/lib/api/endpoints";

export default function CirclesStats() {
  const [circleCount, setCircleCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    circlesApi
      .list()
      .then((res) => setCircleCount(res.items?.length ?? 0))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <div className="flex items-center justify-center rounded-2xl bg-white p-4 animate-pulse">
          <div className="flex flex-col items-center gap-1">
            <div className="h-6 w-8 rounded-lg bg-gray-100" />
            <div className="h-3 w-14 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-center rounded-2xl bg-white p-4">
        <div className="text-center">
          <p className="text-xl font-bold text-main-text">
            {String(circleCount).padStart(2, "0")}
          </p>
          <p className="mt-1 text-xs text-muted">Circles</p>
        </div>
      </div>
    </div>
  );
}
