"use client";

import Image from "next/image";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiOutlineMagnifyingGlass, HiOutlineUserPlus } from "react-icons/hi2";

const allMembers = [
  { name: "Sandra Flavor", username: "@sandi21", avatar: "/Assets/Images/Avatar/avatar-2.jpeg" },
  { name: "Andero Salem", username: "@andysem#1", avatar: "/Assets/Images/Avatar/avatar-3.jpeg" },
  { name: "Greg Maxwell", username: "@maxgreg!!6", avatar: "/Assets/Images/Avatar/avatar-4.jpeg" },
  { name: "Tommy Sydney", username: "@tomsen8*1", avatar: "/Assets/Images/Avatar/avatar-5.jpeg" },
  { name: "Natalie Chen", username: "@natchen", avatar: "/Assets/Images/Avatar/avatar-6.jpeg" },
];

export default function MemberList() {
  const [search, setSearch] = useState("");
  const [invited, setInvited] = useState<Record<string, boolean>>({
    "@sandi21": true,
    "@maxgreg!!6": true,
    "@tomsen8*1": true,
  });

  const filtered = allMembers.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.username.toLowerCase().includes(search.toLowerCase())
  );

  function handleInvite(username: string) {
    setInvited((prev) => ({ ...prev, [username]: true }));
  }

  return (
    <div className="px-4 py-2">
      <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 mb-4 transition-all duration-200 focus-within:ring-2 focus-within:ring-brand">
        <HiOutlineMagnifyingGlass className="w-5 h-5 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search friends to invite..."
          className="flex-1 bg-transparent text-sm text-main-text placeholder:text-muted outline-none"
        />
      </div>

      <AnimatePresence mode="wait">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center justify-center rounded-2xl bg-white py-12 px-4"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-50 mb-4">
              <HiOutlineUserPlus className="w-7 h-7 text-muted" />
            </div>
            <p className="text-base font-semibold text-main-text mb-1">No friends found</p>
            <p className="text-sm text-muted text-center">
              Try a different name or username to find your friends
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-white divide-y divide-gray-50"
          >
            {filtered.map((member, i) => {
              const isInvited = invited[member.username];
              return (
                <motion.div
                  key={member.username}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 * i }}
                  className="flex items-center justify-between px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <Image
                      src={member.avatar}
                      alt={member.name}
                      width={40}
                      height={40}
                      className="rounded-full object-cover"
                    />
                    <div>
                      <p className="text-sm font-semibold text-main-text">{member.name}</p>
                      <p className="text-xs text-muted">{member.username}</p>
                    </div>
                  </div>
                  {isInvited ? (
                    <span className="rounded-full bg-gray-50 px-4 py-1.5 text-xs text-muted">
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
