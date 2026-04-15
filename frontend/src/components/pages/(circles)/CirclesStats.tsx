"use client";

import { useEffect, useState } from "react";
import { HiOutlineUserGroup } from "react-icons/hi2";
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
        <div className="flex items-center gap-4 rounded-2xl bg-white p-4 animate-pulse">
          <div className="h-10 w-10 rounded-full bg-gray-100" />
          <div className="flex flex-col gap-1">
            <div className="h-5 w-8 rounded-lg bg-gray-100" />
            <div className="h-3 w-14 rounded-lg bg-gray-100" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-4 rounded-2xl bg-white p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50">
          <HiOutlineUserGroup className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-xl font-bold text-main-text">
            {String(circleCount).padStart(2, "0")}
          </p>
          <p className="text-xs text-muted">Circles joined</p>
        </div>
      </div>
    </div>
  );
}
