"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HiCheck, HiOutlineShieldCheck } from "react-icons/hi2";
import { EmojiAvatar } from "@/components/shared";
import { MOCK_USERS } from "@/lib/mockUsers";

const circleMembers = [
  MOCK_USERS.sandra,
  MOCK_USERS.andero,
  MOCK_USERS.greg,
  MOCK_USERS.tommy,
  MOCK_USERS.natalie,
];

export default function ResolverPicker() {
  const [selected, setSelected] = useState<string[]>([
    MOCK_USERS.sandra.username,
    MOCK_USERS.andero.username,
  ]);

  function toggle(username: string) {
    setSelected((prev) =>
      prev.includes(username)
        ? prev.filter((u) => u !== username)
        : [...prev, username]
    );
  }

  return (
    <div className="rounded-2xl bg-white p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50">
          <HiOutlineShieldCheck className="w-5 h-5 text-brand" />
        </div>
        <div>
          <p className="text-sm font-semibold text-main-text">Pick your trusted friends</p>
          <p className="text-xs text-muted mt-0.5">
            They&apos;ll decide if this goal was reached when it&apos;s time to resolve
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {circleMembers.map((member) => {
          const isSelected = selected.includes(member.username);
          return (
            <motion.button
              type="button"
              key={member.username}
              onClick={() => toggle(member.username)}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-3 rounded-xl p-3 cursor-pointer transition-all duration-200 ${
                isSelected ? "bg-brand-light ring-2 ring-main-text" : "bg-gray-50"
              }`}
            >
              <EmojiAvatar avatar={member.avatar} size={36} />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-main-text">{member.name}</p>
                <p className="text-xs text-muted">{member.username}</p>
              </div>
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                  isSelected ? "bg-main-text" : "border-2 border-gray-200"
                }`}
              >
                {isSelected && <HiCheck className="w-4 h-4 text-white" />}
              </div>
            </motion.button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted">
        {selected.length} of {circleMembers.length} selected
      </p>
    </div>
  );
}
