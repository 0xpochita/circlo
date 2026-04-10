"use client";

import { useState } from "react";
import { motion } from "framer-motion";

const durations = [
  { label: "1D", full: "1 Day", hours: 24 },
  { label: "3D", full: "3 Days", hours: 72 },
  { label: "7D", full: "7 Days", hours: 168 },
  { label: "14D", full: "14 Days", hours: 336 },
  { label: "30D", full: "30 Days", hours: 720 },
];

const outcomes = ["Yes / No", "Multiple Choice", "Numeric Range"];

export default function PredictionForm() {
  const [selectedDuration, setSelectedDuration] = useState(2);
  const [selectedOutcome, setSelectedOutcome] = useState(0);

  return (
    <div className="px-4 py-2 flex flex-col gap-4">
      <div className="rounded-2xl bg-white p-4">
        <label className="text-sm font-medium text-main-text mb-2 block">
          Prediction Title
        </label>
        <input
          type="text"
          placeholder="e.g. BTC will hit 80k this week"
          className="w-full rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="rounded-2xl bg-white p-4">
        <label className="text-sm font-medium text-main-text mb-2 block">
          Description (optional)
        </label>
        <textarea
          placeholder="Add more context for your prediction..."
          rows={3}
          className="w-full resize-none rounded-xl bg-gray-50 px-4 py-3 text-sm text-main-text placeholder:text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-brand"
        />
      </div>

      <div className="rounded-2xl bg-white p-4">
        <p className="text-sm font-medium text-main-text mb-3">Outcome Type</p>
        <div className="flex gap-2">
          {outcomes.map((outcome, i) => (
            <button
              type="button"
              key={outcome}
              onClick={() => setSelectedOutcome(i)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-medium cursor-pointer transition-all duration-200 ${
                selectedOutcome === i
                  ? "bg-brand text-white"
                  : "bg-gray-50 text-muted"
              }`}
            >
              {outcome}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-main-text">Deadline</p>
          <p className="text-xs text-muted">~{durations[selectedDuration].hours}h</p>
        </div>
        <div className="flex gap-2 mb-4">
          {durations.map((d, i) => (
            <button
              type="button"
              key={d.label}
              onClick={() => setSelectedDuration(i)}
              className={`flex-1 rounded-xl py-2.5 text-xs font-medium cursor-pointer transition-all duration-200 ${
                selectedDuration === i
                  ? "bg-brand text-white"
                  : "bg-gray-50 text-muted"
              }`}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="relative h-2 rounded-full bg-gray-100">
          <motion.div
            className="absolute top-0 left-0 h-2 rounded-full bg-brand"
            animate={{ width: `${((selectedDuration + 1) / durations.length) * 100}%` }}
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
          Stake Amount
        </label>
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3">
          <input
            type="text"
            placeholder="0.00"
            className="flex-1 bg-transparent text-sm text-main-text placeholder:text-muted outline-none"
          />
          <span className="text-sm font-medium text-muted">USDm</span>
        </div>
        <div className="flex gap-2 mt-3">
          {["0.10", "0.50", "1.00", "5.00"].map((amount) => (
            <button
              type="button"
              key={amount}
              className="flex-1 rounded-lg bg-gray-50 py-2 text-xs font-medium text-muted cursor-pointer transition-all duration-200 active:scale-[0.95] hover:bg-gray-100"
            >
              {amount}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
