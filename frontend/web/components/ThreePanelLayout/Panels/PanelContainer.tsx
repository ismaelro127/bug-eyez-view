import React from "react";

interface Props {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;

  /** ✅ NEW: allow panels like EPG to manage their own scroll/overflow */
  contentClassName?: string;
  /** ✅ NEW: allow disabling the default overflow-y-auto wrapper */
  disableDefaultScroll?: boolean;
}

const glassPanelStyle: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.15)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  borderRadius: "1rem",

  /* 🔑 layout-safe changes */
  position: "relative",
  zIndex: 1,

  display: "flex",          // allow header + content stacking
  flexDirection: "column",  // header on top, content fills rest
  minHeight: 0,             // REQUIRED for nested scroll areas
  overflow: "hidden",       // prevents header/content overlap
};


const headerStyle: React.CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  padding: "8px 12px",
  fontWeight: 600,
  color: "rgba(255,255,255,0.9)",
  textAlign: "center",
  position: "relative",
  zIndex: 5,
};

export default function PanelContainer({
  title,
  children,
  style,
  className = "",
  contentClassName = "",
  disableDefaultScroll = false,
}: Props) {
  const isVideo = title === "LIVE PLAYER";

  // ✅ If caller disables default scroll, we won't force overflow-y-auto or a fixed calc height container.
  const useDefaultScroll = !disableDefaultScroll && !isVideo;

  return (
    <div
      className={`glass-panel ${isVideo ? "live-panel-glow" : ""} ${className}`}
      style={{ ...glassPanelStyle, ...style }}
    >
      <div style={headerStyle}>{title}</div>

      {/* MAIN CONTENT */}
      <div
  className={`relative ${useDefaultScroll ? "overflow-y-auto" : ""} ${contentClassName}`}
  style={{
    flex: 1,
    minHeight: 0, // 🔑 REQUIRED for scroll children
    position: "relative",
    zIndex: 20,
  }}
>

        {children}
      </div>
    </div>
  );
}
