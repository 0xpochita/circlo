"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UsdtLabel } from "@/components/shared";
import { referralsApi } from "@/lib/api/endpoints";

export default function RewardStats() {
  const [invitedCount, setInvitedCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [totalEarned, setTotalEarned] = useState("0");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    referralsApi
      .me()
      .then((res) => {
        setInvitedCount(res.invitedCount);
        setVerifiedCount(res.verifiedCount);
        setTotalEarned(res.totalEarned);
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = [
    { value: loading ? "--" : String(invitedCount).padStart(2, "0"), label: "Friends invited", usdt: false },
    { value: loading ? "--" : String(verifiedCount).padStart(2, "0"), label: "Friends verified", usdt: false },
    { value: loading ? "--" : totalEarned, label: "Total earned", usdt: true },
  ];

  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Your Rewards</p>
        <button
          type="button"
          className="rounded-full border border-gray-100 bg-white px-4 py-1.5 text-xs font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
        >
          View Details
        </button>
      </div>
      <div className="flex items-center rounded-2xl bg-white p-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex-1 text-center ${i !== stats.length - 1 ? "border-r border-gray-100" : ""}`}
          >
            <p className="text-xl font-bold text-main-text inline-flex items-center gap-1">
              {stat.value}
              {stat.usdt && <UsdtLabel size={14} className="text-xs font-medium" />}
            </p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
