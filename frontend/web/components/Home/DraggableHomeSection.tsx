"use client";

import React from "react";

type DraggableHomeSectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
  draggingId: string | null;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragEnd: () => void;
};

export default function DraggableHomeSection({
  id,
  title,
  children,
  draggingId,
  onDragStart,
  onDragOver,
  onDragEnd,
}: DraggableHomeSectionProps) {
  const isDragging = draggingId === id;

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", id);
        onDragStart(id);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver(id);
      }}
      onDragEnd={onDragEnd}
      className="mb-4 rounded-2xl transition"
      style={{
        opacity: isDragging ? 0.45 : 1,
        outline: isDragging
          ? "2px dashed var(--bug-accent-border)"
          : "none",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          className="w-7 h-7 rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            border: "1px solid var(--bug-accent-border)",
            background: "var(--bug-accent-soft)",
            color: "var(--bug-accent)",
          }}
          title="Drag to reorder"
        >
          ⋮⋮
        </button>

        <div
          className="font-bold"
          style={{ color: "var(--bug-accent)" }}
        >
          {title}
        </div>
      </div>

      {children}
    </div>
  );
}