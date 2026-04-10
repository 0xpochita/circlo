"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const members = [
  { name: "Sandra Flavor", username: "@sandi21", color: "#3B82F6", initials: "SF" },
  { name: "Andero Salem", username: "@andysem#1", color: "#F59E0B", initials: "AS" },
  { name: "Greg Maxwell", username: "@maxgreg!!6", color: "#EC4899", initials: "GM" },
  { name: "Tommy Sydney", username: "@tomsen8*1", color: "#F59E0B", initials: "TS" },
];

export default function MemberList() {
  const [invited, setInvited] = useState<Record<string, boolean>>({
    "@sandi21": true,
    "@maxgreg!!6": true,
    "@tomsen8*1": true,
  });

  function handleInvite(username: string) {
    setInvited((prev) => ({ ...prev, [username]: true }));
  }

  return (
    <div className="px-4 py-2">
      <div className="border-t border-dashed border-muted/30 mb-4" />
      <div className="rounded-2xl bg-surface divide-y divide-muted/10">
        {members.map((member, i) => {
          const isInvited = invited[member.username];
          return (
            <motion.div
              key={member.username}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 + i * 0.08 }}
              className="flex items-center justify-between px-4 py-3.5"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${member.color}20` }}
                >
                  <span
                    className="text-xs font-bold"
                    style={{ color: member.color }}
                  >
                    {member.initials}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-main-text">{member.name}</p>
                  <p className="text-xs text-muted">{member.username}</p>
                </div>
              </div>
              {isInvited ? (
                <span className="rounded-full bg-surface px-4 py-1.5 text-xs text-muted">
                  Invited
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => handleInvite(member.username)}
                  className="rounded-full bg-brand px-4 py-1.5 text-xs font-medium text-white cursor-pointer transition-all duration-200 active:scale-[0.95]"
                >
                  Invite
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
