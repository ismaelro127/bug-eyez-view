import React from "react";
import type { CaptionCapabilities, CaptionMode } from "../types";

type Props = {
  value: CaptionMode;
  onChange: (mode: CaptionMode) => void;
  caps: CaptionCapabilities;
};

function Btn({
  active,
  disabled,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-md text-xs font-semibold transition",
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/10",
        active ? "bg-emerald-500/20 text-emerald-300" : "bg-white/5 text-gray-200",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default function CaptionsToggle({ value, onChange, caps }: Props) {
  const nativeEnabled = caps.native;

  // AI is server-gated (will be false until you enable later)
  const aiLiveEnabled = caps.ai_live;
  const aiVodEnabled = caps.ai_on_demand;

  return (
    <div className="flex items-center gap-2">
      <Btn active={value === "off"} onClick={() => onChange("off")}>
        CC Off
      </Btn>

      <Btn
        active={value === "native"}
        disabled={!nativeEnabled}
        title={!nativeEnabled ? "Captions not available for this stream" : ""}
        onClick={() => onChange("native")}
      >
        Native CC
      </Btn>

      <Btn
        active={value === "ai_live"}
        disabled={!aiLiveEnabled}
        title={!aiLiveEnabled ? "AI Live captions (coming soon)" : ""}
        onClick={() => onChange("ai_live")}
      >
        AI Live 🔒
      </Btn>

      <Btn
        active={value === "ai_on_demand"}
        disabled={!aiVodEnabled}
        title={!aiVodEnabled ? "AI captions for replays (coming soon)" : ""}
        onClick={() => onChange("ai_on_demand")}
      >
        AI Replay 🔒
      </Btn>
    </div>
  );
}
