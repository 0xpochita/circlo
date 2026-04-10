"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlineLockClosed, HiOutlineGlobeAlt, HiOutlineSparkles } from "react-icons/hi2";
import {
  HiOutlineArrowTrendingUp,
} from "react-icons/hi2";
import { IoFitnessOutline, IoGameControllerOutline, IoMusicalNotesOutline } from "react-icons/io5";

const categories = [
  { icon: HiOutlineSparkles, label: "General" },
  { icon: HiOutlineArrowTrendingUp, label: "Crypto" },
  { icon: IoFitnessOutline, label: "Fitness" },
  { icon: IoGameControllerOutline, label: "Gaming" },
  { icon: IoMusicalNotesOutline, label: "Music" },
];

export default function CircleSetupForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<"public" | "private">("public");
  const [category, setCategory] = useState(0);

  return (
    <div className="px-4 py-2 flex flex-col gap-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-white p-4"
      >
        <label className="text-sm font-medium text-main-text mb-2 block">
          Circle Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Crypto Circle"
          className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="rounded-2xl bg-white p-4"
      >
        <label className="text-sm font-medium text-main-text mb-2 block">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What's this circle about?"
          rows={3}
          className="w-full resize-none rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="rounded-2xl bg-white p-4"
      >
        <p className="text-sm font-medium text-main-text mb-3">Category</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat, i) => (
            <button
              type="button"
              key={cat.label}
              onClick={() => setCategory(i)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium cursor-pointer transition-all duration-200 ${
                category === i
                  ? "bg-brand text-white"
                  : "bg-gray-50 text-muted"
              }`}
            >
              <cat.icon className="w-4 h-4" />
              {cat.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
        className="rounded-2xl bg-white p-4"
      >
        <p className="text-sm font-medium text-main-text mb-3">Privacy</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPrivacy("public")}
            className={`flex-1 flex flex-col items-start gap-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
              privacy === "public" ? "bg-brand text-white" : "bg-gray-50 text-muted"
            }`}
          >
            <HiOutlineGlobeAlt className="w-5 h-5" />
            <div className="text-left">
              <p className={`text-sm font-semibold ${privacy === "public" ? "text-white" : "text-main-text"}`}>
                Public
              </p>
              <p className="text-xs">Anyone can join</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setPrivacy("private")}
            className={`flex-1 flex flex-col items-start gap-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
              privacy === "private" ? "bg-brand text-white" : "bg-gray-50 text-muted"
            }`}
          >
            <HiOutlineLockClosed className="w-5 h-5" />
            <div className="text-left">
              <p className={`text-sm font-semibold ${privacy === "private" ? "text-white" : "text-main-text"}`}>
                Private
              </p>
              <p className="text-xs">Invite only</p>
            </div>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
