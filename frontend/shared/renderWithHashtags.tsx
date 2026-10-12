import React from "react";

export function renderWithHashtags(text?: string | null) {
  if (!text || typeof text !== "string") {
    return null;
  }

  return text.split(/(\#[a-zA-Z0-9_]+)/g).map((part, i) =>
    part.startsWith("#") ? (
      <span key={i} className="text-emerald-400 font-medium">
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
