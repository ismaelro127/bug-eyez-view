"use client";

import React from "react";

type ProfileStatCardProps = {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  tone?: "default" | "emerald" | "cyan" | "yellow" | "purple" | "red";
};

const toneStyles: Record<
  NonNullable<ProfileStatCardProps["tone"]>,
  {
    border: string;
    background: string;
    label: string;
    value: string;
    glow?: string;
  }
> = {
  default: {
    border: "rgba(255,255,255,0.10)",
    background: "rgba(255,255,255,0.05)",
    label: "rgba(255,255,255,0.55)",
    value: "white",
  },

  emerald: {
    border: "var(--bug-accent-border)",
    background: "var(--bug-accent-soft)",
    label: "var(--bug-accent)",
    value: "var(--bug-accent)",
    glow: "var(--bug-glow)",
  },

  cyan: {
    border: "var(--bug-accent-border)",
    background: "var(--bug-accent-soft)",
    label: "var(--bug-accent)",
    value: "var(--bug-accent)",
    glow: "var(--bug-glow)",
  },

  yellow: {
    border: "var(--bug-accent-border)",
    background: "var(--bug-accent-soft)",
    label: "var(--bug-accent)",
    value: "var(--bug-accent)",
    glow: "var(--bug-glow)",
  },

  purple: {
    border: "var(--bug-accent-border)",
    background: "var(--bug-accent-soft)",
    label: "var(--bug-accent)",
    value: "var(--bug-accent)",
    glow: "var(--bug-glow)",
  },

  red: {
    border: "rgba(248,113,113,0.45)",
    background: "rgba(248,113,113,0.12)",
    label: "#fca5a5",
    value: "#fca5a5",
    glow: "0 0 20px rgba(248,113,113,0.22)",
  },
};

export default function ProfileStatCard({
  label,
  value,
  subValue,
  tone = "default",
}: ProfileStatCardProps) {
  const styleSet = toneStyles[tone] ?? toneStyles.default;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        border: `1px solid ${styleSet.border}`,
        background: styleSet.background,
        boxShadow: styleSet.glow || "none",
      }}
    >
      <div
        className="text-xs"
        style={{ color: styleSet.label }}
      >
        {label}
      </div>

      <div
        className="text-xl md:text-2xl font-black mt-1 break-words"
        style={{ color: styleSet.value }}
      >
        {value}
      </div>

      {subValue && (
        <div className="text-xs text-gray-500 mt-1 break-words">
          {subValue}
        </div>
      )}
    </div>
  );
}