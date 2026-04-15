"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiXMark, HiOutlinePencil, HiCheck } from "react-icons/hi2";
import { toast } from "sonner";
import { EmojiAvatar, EmojiPicker } from "@/components/shared";
import { useUserStore } from "@/stores/userStore";
import { usersApi } from "@/lib/api/endpoints";
import { useAuthStore } from "@/stores/authStore";
import type { UserAvatar } from "@/types";

type EditProfileSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function EditProfileSheet({ open, onClose }: EditProfileSheetProps) {
  const storeName = useUserStore((s) => s.name);
  const storeUsername = useUserStore((s) => s.username);
  const storeAvatar = useUserStore((s) => s.avatar);
  const setName = useUserStore((s) => s.setName);
  const setUsername = useUserStore((s) => s.setUsername);
  const setAvatar = useUserStore((s) => s.setAvatar);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [name, setNameLocal] = useState(storeName);
  const [username, setUsernameLocal] = useState("");
  const [avatar, setAvatarLocal] = useState<UserAvatar>(storeAvatar);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setNameLocal(storeName);
      setUsernameLocal(storeUsername.replace(/^@/, ""));
      setAvatarLocal(storeAvatar);
      if (isAuthenticated) {
        usersApi.me().then((user) => {
          if (user.username) setUsernameLocal(user.username);
          if (user.name) setNameLocal(user.name);
        }).catch(() => {});
      }
    }
  }, [open, storeName, storeAvatar, isAuthenticated]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  async function handleSave() {
    const trimmedName = name.trim() || "Player";
    const trimmedUsername = username.trim();
    setIsSaving(true);

    setName(trimmedName);
    setAvatar(avatar);
    if (trimmedUsername) setUsername(trimmedUsername);

    if (isAuthenticated) {
      try {
        await usersApi.update({
          name: trimmedName,
          ...(trimmedUsername ? { username: trimmedUsername } : {}),
          avatarEmoji: avatar.emoji,
          avatarColor: avatar.color,
        });
        toast("Profile updated");
      } catch (err) {
        const message = err instanceof Error ? err.message : "";
        if (message.includes("Username already taken")) {
          toast.error("Username already taken");
        } else {
          toast.error("Failed to update profile");
        }
        setIsSaving(false);
        return;
      }
    }

    setIsSaving(false);
    onClose();
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-100 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring" as const, stiffness: 300, damping: 32 }}
              className="fixed bottom-0 left-1/2 z-101 w-full max-w-md -translate-x-1/2 flex flex-col rounded-t-3xl bg-white"
              style={{ maxHeight: "90dvh" }}
            >
              <div className="flex items-start justify-between px-6 pt-6 pb-4 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-main-text">Edit Profile</h2>
                  <p className="mt-1 text-sm text-muted">Update your name, username, and avatar</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-[0.95]"
                >
                  <HiXMark className="w-5 h-5 text-main-text" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="flex flex-col items-center mb-6">
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="relative cursor-pointer mb-2"
                  >
                    <EmojiAvatar avatar={avatar} size={80} />
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-gray-100">
                      <HiOutlinePencil className="w-3.5 h-3.5 text-main-text" />
                    </div>
                  </button>
                  <p className="text-xs text-muted">Tap to change</p>
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 mb-3">
                  <label className="text-sm font-medium text-main-text mb-2 block">
                    Display name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setNameLocal(e.target.value)}
                    placeholder="Your name"
                    maxLength={80}
                    className="w-full rounded-xl bg-white px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
                  />
                </div>

                <div className="rounded-2xl bg-gray-50 p-4 mb-6">
                  <label className="text-sm font-medium text-main-text mb-2 block">
                    Username
                  </label>
                  <div className="flex items-center rounded-xl bg-white px-4 py-3">
                    <span className="text-sm text-muted mr-1">@</span>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsernameLocal(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))}
                      placeholder="username"
                      maxLength={20}
                      className="flex-1 bg-transparent text-sm text-main-text placeholder:text-muted outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-muted">Letters, numbers, and underscores only</p>
                </div>

                <motion.button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  whileTap={isSaving ? {} : { scale: 0.97 }}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer disabled:bg-gray-200 disabled:text-muted disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : (
                    <>
                      <HiCheck className="w-5 h-5" />
                      Save Changes
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={avatar}
        onSave={setAvatarLocal}
        title="What emoji expresses you?"
        subtitle="Pick one that feels like you today"
      />
    </>
  );
}
