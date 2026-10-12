"use client";

import React from "react";

type HomeStatCardProps = {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
};

export default function HomeStatCard({
  label,
  value,
  subValue,
}: HomeStatCardProps) {
  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: "1px solid var(--bug-accent-border)",
        background: "var(--bug-accent-soft)",
        boxShadow: "var(--bug-glow)",
      }}
    >
      <div className="text-xs text-gray-300/80">
        {label}
      </div>

      <div
        className="text-2xl font-black mt-1"
        style={{ color: "var(--bug-accent)" }}
      >
        {value}
      </div>

      {subValue && (
        <div className="text-xs text-gray-400 mt-1">
          {subValue}
        </div>
      )}
    </div>
  );
}