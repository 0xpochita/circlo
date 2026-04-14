"use client";

import { HiOutlineUserGroup } from "react-icons/hi2";

export default function ParticipantList() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Participants</p>
        <span className="text-xs text-muted">0 joined</span>
      </div>
      <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-10 px-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-50 mb-3">
          <HiOutlineUserGroup className="w-6 h-6 text-muted" />
        </div>
        <p className="text-sm font-semibold text-main-text mb-1">No participants yet</p>
        <p className="text-xs text-muted text-center">Participants will appear here</p>
      </div>
    </div>
  );
}
