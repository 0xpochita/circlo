"use client";

const stats = [
  { value: "128", label: "Members" },
  { value: "24", label: "Active goals" },
  { value: "82 USDm", label: "Total staked" },
];

export default function DetailsStats() {
  return (
    <div className="px-4 py-2">
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
