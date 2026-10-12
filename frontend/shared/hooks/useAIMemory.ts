import { useEffect, useState } from "react";

export function useAIMemory() {
  const [memory, setMemory] = useState<any[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("ai_memory");
    if (stored) setMemory(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("ai_memory", JSON.stringify(memory));
  }, [memory]);

  function record(event: { type: string; value: string }) {
    setMemory((prev) => [
      ...prev,
      { ...event, ts: Date.now() },
    ]);
  }

  function recall(type?: string) {
    return type ? memory.filter((m) => m.type === type) : memory;
  }

  function clearMemory() {
    setMemory([]);
  }

  return { memory, record, recall, clearMemory };
}
