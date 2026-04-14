"use client";

import { useState } from "react";
import { HiOutlinePencilSquare } from "react-icons/hi2";
import { ProfileHero, ReferralBanner, ActiveCircles, RecentPredictions, DisconnectButton, EditProfileSheet } from "@/components/pages/(profile)";
import { BottomTabBar, PageTransition } from "@/components/pages/(app)";

export default function ProfilePage() {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-main-bg pb-28">
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
        <DisconnectButton />
      </PageTransition>
      <BottomTabBar />
      <EditProfileSheet open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
