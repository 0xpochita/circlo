"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlinePencil } from "react-icons/hi2";
import { toast } from "sonner";
import { EmojiAvatar, EmojiPicker } from "@/components/shared";
import { useUserStore } from "@/stores/userStore";
import { useAuthStore } from "@/stores/authStore";
import { usersApi } from "@/lib/api/endpoints";
import type { UserAvatar } from "@/types";

type ProfileStepProps = {
  onNext: () => void;
  onBack: () => void;
};

export default function ProfileStep({ onNext, onBack }: ProfileStepProps) {
  const setName = useUserStore((s) => s.setName);
  const setAvatar = useUserStore((s) => s.setAvatar);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [name, setNameLocal] = useState("");
  const [avatar, setAvatarLocal] = useState<UserAvatar>({
    emoji: "🚀",
    color: "#ec4899",
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  async function handleComplete() {
    const trimmed = name.trim() || "Player";
    setIsSaving(true);

    setName(trimmed);
    setAvatar(avatar);

    if (isAuthenticated) {
      try {
        await usersApi.update({
          name: trimmed,
          avatarEmoji: avatar.emoji,
          avatarColor: avatar.color,
        });
      } catch {}
    }

    setIsSaving(false);
    toast.success(`Welcome, ${trimmed}!`);
    onNext();
  }

  return (
    <div className="flex flex-col min-h-dvh">
      <div className="flex-1 overflow-y-auto px-6 pt-10 pb-4">
        <button
          type="button"
          onClick={onBack}
          className="self-start text-sm text-muted cursor-pointer mb-6"
        >
          Back
        </button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold tracking-tight text-main-text mb-1">
            Set up your profile
          </h1>
          <p className="text-sm text-muted mb-6">
            Pick an avatar and name so your friends can find you.
          </p>

          <div className="flex flex-col items-center mb-6">
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="relative cursor-pointer mb-2"
            >
              <motion.div
                key={`${avatar.emoji}-${avatar.color}`}
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
              >
                <EmojiAvatar avatar={avatar} size={88} />
              </motion.div>
              <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-gray-100">
                <HiOutlinePencil className="w-3.5 h-3.5 text-main-text" />
              </div>
            </button>
            <p className="text-xs text-muted">Tap to change</p>
          </div>

          <div className="rounded-2xl bg-white p-4 mb-3">
            <label className="text-sm font-medium text-main-text mb-2 block">
              Display name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setNameLocal(e.target.value)}
              placeholder="How should we call you?"
              maxLength={30}
              className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="rounded-2xl bg-white p-4">
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none">💡</span>
              <div>
                <p className="text-sm font-semibold text-main-text">Pro tip</p>
                <p className="text-xs text-muted">
                  Use a name your friends will recognize. You can always change it later.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="shrink-0 px-6 pb-8 pt-3 bg-main-bg"
      >
        <motion.button
          type="button"
          onClick={handleComplete}
          disabled={isSaving}
          whileTap={isSaving ? {} : { scale: 0.97 }}
          className="w-full rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
        >
          {isSaving
            ? "Saving..."
            : name.trim()
              ? `Continue as ${name.trim()}`
              : "Continue as Player"}
        </motion.button>
        <button
          type="button"
          onClick={handleComplete}
          disabled={isSaving}
          className="w-full mt-3 text-sm font-medium text-muted cursor-pointer text-center disabled:cursor-not-allowed"
        >
          Skip for now
        </button>
      </motion.div>

      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={avatar}
        onSave={setAvatarLocal}
        title="What emoji expresses you?"
        subtitle="Pick one that feels like you today"
      />
    </div>
  );
}
