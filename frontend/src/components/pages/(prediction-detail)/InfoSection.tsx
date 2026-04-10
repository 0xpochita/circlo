"use client";

const info = [
  { label: "Created by", value: "Crypto Circle" },
  { label: "Start date", value: "Apr 9, 2026" },
  { label: "End date", value: "Apr 12, 2026" },
  { label: "Resolution source", value: "CoinGecko API" },
  { label: "Minimum stake", value: "0.10 USDm" },
];

export default function InfoSection() {
  return (
    <div className="px-4 py-2">
      <p className="text-base font-bold text-main-text mb-3">Details</p>
      <div className="rounded-2xl bg-white divide-y divide-gray-50">
        {info.map((item) => (
          <div key={item.label} className="flex items-center justify-between px-4 py-3">
            <p className="text-sm text-muted">{item.label}</p>
            <p className="text-sm font-medium text-main-text">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
