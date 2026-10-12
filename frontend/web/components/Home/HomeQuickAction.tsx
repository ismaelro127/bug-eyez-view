"use client";

import React from "react";

type HomeQuickActionProps = {
  icon: string;
  label: string;
  description?: string;
  onClick: () => void;
};

export default function HomeQuickAction({
  icon,
  label,
  description,
  onClick,
}: HomeQuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl p-4 text-left transition hover:scale-[1.01] active:scale-[0.99]"
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{
            border: "1px solid var(--bug-accent-border)",
            background: "var(--bug-accent-soft)",
            color: "var(--bug-accent)",
            boxShadow: "var(--bug-glow)",
          }}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <div className="font-bold text-white">
            {label}
          </div>

          {description && (
            <div className="text-xs text-gray-400 mt-1">
              {description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}