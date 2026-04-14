"use client";

import { motion } from "framer-motion";
import {
  HiOutlineLockClosed,
  HiOutlineGlobeAlt,
  HiOutlinePencil,
} from "react-icons/hi2";
import { useState } from "react";
import { EmojiAvatar, EmojiPicker } from "@/components/shared";
import { useCreateCircleStore } from "@/stores/createCircleStore";

const categories = [
  { emoji: "✨", label: "General", value: "general" },
  { emoji: "💎", label: "Crypto", value: "crypto" },
  { emoji: "⚡", label: "Fitness", value: "fitness" },
  { emoji: "🎮", label: "Gaming", value: "gaming" },
  { emoji: "🎧", label: "Music", value: "music" },
];

export default function CircleSetupForm() {
  const store = useCreateCircleStore();
  const [pickerOpen, setPickerOpen] = useState(false);

  const categoryIndex = categories.findIndex((c) => c.value === store.category);

  return (
    <div className="px-4 py-2 flex flex-col gap-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-white p-4"
      >
        <p className="text-sm font-medium text-main-text mb-3">Circle Logo</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="relative cursor-pointer transition-transform duration-200 active:scale-[0.95]"
          >
            <EmojiAvatar avatar={store.avatar} size={72} />
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-gray-100">
              <HiOutlinePencil className="w-3.5 h-3.5 text-main-text" />
            </div>
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-main-text">Pick a vibe</p>
            <p className="text-xs text-muted">
              Choose an emoji and color that represent your circle
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.08 }}
        className="rounded-2xl bg-white p-4"
      >
        <label className="text-sm font-medium text-main-text mb-2 block">
          Circle Name
        </label>
        <input
          type="text"
          value={store.name}
          onChange={(e) => store.setName(e.target.value)}
          placeholder="e.g. Crypto Circle"
          className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className="rounded-2xl bg-white p-4"
      >
        <label className="text-sm font-medium text-main-text mb-2 block">
          Description
        </label>
        <textarea
          value={store.description}
          onChange={(e) => store.setDescription(e.target.value)}
          placeholder="What's this circle about?"
          rows={3}
          className="w-full resize-none rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.24 }}
        className="rounded-2xl bg-white p-4"
      >
        <p className="text-sm font-medium text-main-text mb-3">Category</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.value}
              onClick={() => store.setCategory(cat.value)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium cursor-pointer transition-all duration-200 ${
                store.category === cat.value
                  ? "bg-brand text-white"
                  : "bg-gray-50 text-muted"
              }`}
            >
              <span className="text-base leading-none">{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.32 }}
        className="rounded-2xl bg-white p-4"
      >
        <p className="text-sm font-medium text-main-text mb-3">Privacy</p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => store.setPrivacy("public")}
            className={`flex-1 flex flex-col items-start gap-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
              store.privacy === "public" ? "bg-brand text-white" : "bg-gray-50 text-muted"
            }`}
          >
            <HiOutlineGlobeAlt className="w-5 h-5" />
            <div className="text-left">
              <p className={`text-sm font-semibold ${store.privacy === "public" ? "text-white" : "text-main-text"}`}>
                Public
              </p>
              <p className="text-xs">Anyone can join</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => store.setPrivacy("private")}
            className={`flex-1 flex flex-col items-start gap-2 rounded-xl p-4 cursor-pointer transition-all duration-200 ${
              store.privacy === "private" ? "bg-brand text-white" : "bg-gray-50 text-muted"
            }`}
          >
            <HiOutlineLockClosed className="w-5 h-5" />
            <div className="text-left">
              <p className={`text-sm font-semibold ${store.privacy === "private" ? "text-white" : "text-main-text"}`}>
                Private
              </p>
              <p className="text-xs">Invite only</p>
            </div>
          </button>
        </div>
      </motion.div>

      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={store.avatar}
        onSave={store.setAvatar}
        title="Pick a vibe for your circle"
        subtitle="Choose an emoji and color that represent it"
      />
    </div>
  );
}
