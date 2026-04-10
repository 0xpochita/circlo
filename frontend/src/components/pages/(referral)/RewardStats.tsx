"use client";

const stats = [
  { value: "03", label: "Friends invited" },
  { value: "02", label: "Friends verified" },
  { value: "20 USDm", label: "Total earned" },
];

export default function RewardStats() {
  return (
    <div className="px-4 py-2">
      <div className="flex items-center justify-between mb-3">
        <p className="text-base font-bold text-main-text">Your Rewards</p>
        <button
          type="button"
          className="rounded-full border border-gray-100 bg-white px-4 py-1.5 text-xs font-medium text-main-text cursor-pointer transition-all duration-200 active:scale-[0.95]"
        >
          View Details
        </button>
      </div>
      <div className="flex items-center rounded-2xl bg-white p-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`flex-1 text-center ${i !== stats.length - 1 ? "border-r border-gray-100" : ""}`}
          >
            <p className="text-xl font-bold text-main-text">{stat.value}</p>
            <p className="mt-1 text-xs text-muted">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
