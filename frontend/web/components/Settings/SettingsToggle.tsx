"use client";

import React from "react";

type SettingsToggleProps = {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
};

export default function SettingsToggle({
  label,
  description,
  checked,
  onChange,
}: SettingsToggleProps) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        padding: 18,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        width: "100%",
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            color: "white",
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          {label}
        </div>

        {description && (
          <div
            style={{
              color: "rgba(180,210,235,0.85)",
              fontSize: 14,
              marginTop: 8,
              lineHeight: 1.35,
            }}
          >
            {description}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 54,
          height: 30,
          minWidth: 54,
          borderRadius: 999,
          border: checked
            ? "2px solid rgba(103,232,249,0.95)"
            : "2px solid rgba(255,255,255,0.28)",
          background: checked
            ? "rgba(34,211,238,0.95)"
            : "rgba(255,255,255,0.16)",
          position: "relative",
          cursor: "pointer",
          padding: 0,
          display: "block",
        }}
        aria-label={label}
        aria-pressed={checked}
      >
        <span
          style={{
            position: "absolute",
            top: 3,
            left: checked ? 27 : 3,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.45)",
            transition: "left 160ms ease",
            display: "block",
          }}
        />
      </button>
    </div>
  );
}