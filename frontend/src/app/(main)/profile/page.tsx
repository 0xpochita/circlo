"use client";

import Link from "next/link";
import { useState } from "react";
import {
  HiOutlineBell,
  HiOutlineChartBar,
  HiOutlineChartPie,
  HiOutlinePencilSquare,
} from "react-icons/hi2";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";
import {
  ActiveCircles,
  DisconnectButton,
  EditProfileSheet,
  ProfileHero,
  RecentPredictions,
  ReferralBanner,
} from "@/components/pages/(profile)";

export default function ProfilePage() {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-safe">
      <PageTransition>
        <ProfileHero />
        <div className="px-4 py-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <HiOutlinePencilSquare className="w-4 h-4" />
            Edit Profile
          </button>
        </div>
        <ReferralBanner />
        <ActiveCircles />
        <RecentPredictions />
        <div className="px-4 py-2">
          <Link
            href="/stats"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <HiOutlineChartPie className="w-4 h-4" />
            My stats & win rate
          </Link>
        </div>
        <div className="px-4 py-2">
          <Link
            href="/stake-history"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <HiOutlineChartBar className="w-4 h-4" />
            View stake history
          </Link>
        </div>
        <div className="px-4 py-2">
          <Link
            href="/notification-settings"
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.97]"
          >
            <HiOutlineBell className="w-4 h-4" />
            Notification settings
          </Link>
        </div>
        <DisconnectButton />
      </PageTransition>
      <BottomTabBar />
      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
