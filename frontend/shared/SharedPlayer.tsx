import React, { useEffect, useState } from "react";
import SmartVideoPlayer from "../web/components/SmartVideoPlayer";
import { Channel } from "../types";
import { emitEvent } from "../web/events/emitEvent";

type Props = {
  channel: Channel | null;
  source: "sidebar" | "epg" | "auto";
  onRequestNextChannel?: (reason: string) => void;

  // Mobile-only optional button.
  showAIButton?: boolean;
  onAIButtonClick?: () => void;
};

function SharedPlayer({
  channel,
  source,
  onRequestNextChannel,
  showAIButton = false,
  onAIButtonClick,
}: Props) {
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    if (!channel) return;

    emitEvent("channel-selected", {
      channel_id: channel.id,
      source,
    });
  }, [channel?.id, source]);

  if (!channel) {
    return (
      <div className="flex items-center justify-center w-full h-full bg-black text-gray-400">
        Select a channel to start playback
      </div>
    );
  }

  
  return (
    <div className="relative w-full h-full bg-black">
      
      
      
      <SmartVideoPlayer
        channel={channel}
        source={source}
        muted={muted}
        onRequestNextChannel={onRequestNextChannel}
      />

      <div
  style={{
    position: "absolute",
    left: 18,
top: 18,
    zIndex: 2147483647,
    display: "flex",
    alignItems: "center",
    gap: 8,
    pointerEvents: "auto",
  }}
>
  {showAIButton && (
    <button
      type="button"
      onClick={onAIButtonClick}
      style={{
        height: 34,
        padding: "0 10px",
        borderRadius: 12,
        background: "rgba(0,0,0,0.88)",
        color: "rgb(165, 243, 252)",
        border: "1px solid rgba(0,255,255,0.6)",
        fontSize: 12,
        fontWeight: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        boxShadow: "0 0 12px rgba(0,255,255,0.25)",
      }}
      title="AI Summary"
    >
      <span>📝</span>
      <span>AI</span>
    </button>
  )}

  
</div>
    </div>
  );
}

export default React.memo(SharedPlayer);