"use client";

import Image from "next/image";
import { useState } from "react";
import { motion } from "framer-motion";
import { HiOutlinePencil, HiOutlineCalendarDays } from "react-icons/hi2";
import { EmojiAvatar, EmojiPicker } from "@/components/shared";
import { useCreateGoalStore } from "@/stores/createGoalStore";

const durations = [
  { label: "1D", full: "1 Day", hours: 24 },
  { label: "3D", full: "3 Days", hours: 72 },
  { label: "7D", full: "7 Days", hours: 168 },
  { label: "14D", full: "14 Days", hours: 336 },
  { label: "30D", full: "30 Days", hours: 720 },
];

const outcomes = [
  { label: "Yes / No", value: 0, enabled: true },
  { label: "Multiple Choice", value: 1, enabled: false },
  { label: "Numeric Range", value: 2, enabled: false },
];

export default function PredictionForm() {
  const store = useCreateGoalStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [useCustomDeadline, setUseCustomDeadline] = useState(false);

  const durationIndex = durations.findIndex((d) => d.hours === store.durationHours);
  const selectedDuration = !useCustomDeadline && durationIndex >= 0 ? durationIndex : -1;

  function handlePresetClick(hours: number) {
    setUseCustomDeadline(false);
    store.setDurationHours(hours);
    store.setCustomDeadline("");
  }

  function handleCustomDate(value: string) {
    setUseCustomDeadline(true);
    store.setCustomDeadline(value);

    const target = new Date(value);
    const now = new Date();
    const diffHours = Math.max(1, Math.round((target.getTime() - now.getTime()) / 3600000));
    store.setDurationHours(diffHours);
  }

  function getDeadlineLabel(): string {
    if (useCustomDeadline && store.customDeadline) {
      const target = new Date(store.customDeadline);
      return target.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    if (selectedDuration >= 0) {
      return `~${durations[selectedDuration].hours}h`;
    }
    return "";
  }

  function getMinDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }

  return (
    <div className="px-4 py-2 flex flex-col gap-4">
      <div className="rounded-2xl bg-white p-4">
        <p className="text-sm font-medium text-main-text mb-3">Goal Image</p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="relative cursor-pointer transition-transform duration-200 active:scale-95"
          >
            <EmojiAvatar avatar={store.avatar} size={72} />
            <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white border border-gray-100">
              <HiOutlinePencil className="w-3.5 h-3.5 text-main-text" />
            </div>
          </button>
          <div className="flex-1">
            <p className="text-sm font-semibold text-main-text">Pick a vibe</p>
            <p className="text-xs text-muted">
              Choose an emoji and color that represent this goal
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4">
        <label className="text-sm font-medium text-main-text mb-2 block">
          Goal Title
        </label>
        <input
          type="text"
          value={store.title}
          onChange={(e) => store.setTitle(e.target.value)}
          placeholder="e.g. Will Sandra get a job in 2026?"
          className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="rounded-2xl bg-white p-4">
        <label className="text-sm font-medium text-main-text mb-2 block">
          Description (optional)
        </label>
        <textarea
          value={store.description}
          onChange={(e) => {
            if (e.target.value.length <= 200) store.setDescription(e.target.value);
          }}
          placeholder="Add more context for this goal..."
          rows={3}
          maxLength={200}
          className="w-full resize-none rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
        />
        <p className={`text-xs mt-1 text-right ${store.description.length >= 180 ? "text-red-400" : "text-muted"}`}>
          {store.description.length}/200
        </p>
      </div>

      <div className="rounded-2xl bg-white p-4">
        <p className="text-sm font-medium text-main-text mb-3">Outcome Type</p>
        <div className="flex gap-2">
          {outcomes.map((outcome) => (
            <button
              type="button"
              key={outcome.label}
              onClick={() => outcome.enabled && store.setOutcomeType(outcome.value)}
              disabled={!outcome.enabled}
              className={`relative flex-1 rounded-xl py-2.5 text-xs font-medium transition-all duration-200 ${
                store.outcomeType === outcome.value
                  ? "bg-gray-900 text-white cursor-pointer"
                  : outcome.enabled
                    ? "bg-gray-50 text-muted cursor-pointer"
                    : "bg-gray-50 text-gray-300 cursor-not-allowed"
              }`}
            >
              {outcome.label}
              {!outcome.enabled && (
                <span className="absolute -top-2 right-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-[8px] font-semibold text-gray-400 leading-none">
                  Soon
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-main-text">Deadline</p>
          <p className="text-xs text-muted">{getDeadlineLabel()}</p>
        </div>
        <div className="flex gap-2 mb-3">
          {durations.map((d, i) => (
            <button
              type="button"
              key={d.label}
              onClick={() => handlePresetClick(d.hours)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-medium cursor-pointer transition-all duration-200 ${
                selectedDuration === i
                  ? "bg-gray-900 text-white"
                  : "bg-gray-50 text-muted"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>

        <div className="relative mb-4">
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3">
            <HiOutlineCalendarDays className="w-4 h-4 text-muted shrink-0" />
            <input
              type="date"
              value={store.customDeadline || ""}
              min={getMinDate()}
              onChange={(e) => handleCustomDate(e.target.value)}
              className="flex-1 bg-transparent text-sm text-main-text placeholder:text-muted outline-none cursor-pointer"
            />
          </div>
        </div>

        <div className="relative h-2 rounded-full bg-gray-100">
          <motion.div
            className="absolute top-0 left-0 h-2 rounded-full bg-gray-900"
            animate={{
              width: useCustomDeadline
                ? `${Math.min(100, (store.durationHours / 720) * 100)}%`
                : `${((selectedDuration + 1) / durations.length) * 100}%`,
            }}
            transition={{ type: "spring" as const, stiffness: 300, damping: 30 }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs text-muted">Short</span>
          <span className="text-xs text-muted">Long</span>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4">
        <label className="text-sm font-medium text-main-text mb-2 block">
          Minimum Stake
        </label>
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3">
          <input
            type="text"
            inputMode="numeric"
            value={store.stakeAmount}
            onChange={(e) => store.setStakeAmount(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0"
            className="flex-1 bg-transparent text-sm text-main-text placeholder:text-muted outline-none"
          />
          <div className="flex items-center gap-1.5">
            <Image
              src="/Assets/Images/Logo/logo-coin/usdt-logo.svg"
              alt="USDT"
              width={18}
              height={18}
            />
            <span className="text-sm font-medium text-main-text">USDT</span>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {["1", "5", "10", "50"].map((amount) => (
            <button
              type="button"
              key={amount}
              onClick={() => store.setStakeAmount(amount)}
              className={`flex-1 rounded-lg py-2 text-xs font-medium cursor-pointer transition-all duration-200 active:scale-95 ${
                store.stakeAmount === amount ? "bg-gray-900 text-white" : "bg-gray-50 text-muted hover:bg-gray-100"
              }`}
            >
              {amount}
            </button>
          ))}
        </div>
      </div>

      <EmojiPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        value={store.avatar}
        onSave={store.setAvatar}
        title="Pick a vibe for your goal"
        subtitle="Choose an emoji and color that describe it"
      />
    </div>
  );
}
