"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HiXMark, HiCheck } from "react-icons/hi2";
import { EMOJI_OPTIONS, COLOR_OPTIONS, getRandomAvatar } from "@/lib/emojiOptions";
import { EmojiAvatar } from "@/components/shared/EmojiAvatar";
import type { UserAvatar } from "@/types";

type EmojiPickerProps = {
  open: boolean;
  onClose: () => void;
  value: UserAvatar;
  onSave: (avatar: UserAvatar) => void;
  title?: string;
  subtitle?: string;
};

export default function EmojiPicker({
  open,
  onClose,
  value,
  onSave,
  title = "What emoji expresses you?",
  subtitle = "Pick one that feels like you today",
}: EmojiPickerProps) {
  const [emoji, setEmoji] = useState(value.emoji);
  const [color, setColor] = useState(value.color);

  useEffect(() => {
    if (open) {
      setEmoji(value.emoji);
      setColor(value.color);
    }
  }, [open, value]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  function handleSurprise() {
    const random = getRandomAvatar();
    setEmoji(random.emoji);
    setColor(random.color);
  }

  function handleSave() {
    onSave({ emoji, color });
    onClose();
  }

  return (
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
                <h2 className="text-xl font-bold text-main-text">{title}</h2>
                <p className="mt-1 text-sm text-muted">{subtitle}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 cursor-pointer transition-all duration-200 active:scale-[0.95]"
              >
                <HiXMark className="w-5 h-5 text-main-text" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6">
              <div className="flex flex-col items-center mb-4">
                <motion.div
                  key={`${emoji}-${color}`}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring" as const, stiffness: 300, damping: 20 }}
                >
                  <EmojiAvatar avatar={{ emoji, color }} size={108} />
                </motion.div>
              </div>

              <div className="flex justify-center mb-5">
                <button
                  type="button"
                  onClick={handleSurprise}
                  className="flex items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-sm font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
                >
                  <span>🎲</span>
                  Surprise me!
                </button>
              </div>

              <div className="mb-5">
                <div className="flex gap-2.5 overflow-x-auto scrollbar-none py-3 px-1">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full cursor-pointer transition-transform duration-200 ${
                        color === c ? "scale-110" : "scale-100 active:scale-[0.92]"
                      }`}
                      style={{ backgroundColor: c }}
                    >
                      {color === c && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring" as const, stiffness: 400, damping: 25 }}
                          className="flex h-5 w-5 items-center justify-center rounded-full bg-white"
                        >
                          <HiCheck className="w-3.5 h-3.5 text-main-text" />
                        </motion.div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-8 gap-2 pb-4">
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    type="button"
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`flex aspect-square items-center justify-center rounded-xl text-2xl cursor-pointer transition-all duration-200 active:scale-[0.92] ${
                      emoji === e ? "bg-gray-200 ring-2 ring-main-text" : "bg-gray-50"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-100 px-6 py-4 pb-8">
              <motion.button
                type="button"
                onClick={handleSave}
                whileTap={{ scale: 0.97 }}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-4 text-base font-semibold text-white cursor-pointer"
              >
                <HiCheck className="w-5 h-5" />
                Save
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
