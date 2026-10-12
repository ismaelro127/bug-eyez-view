import { useEffect, useState } from "react";
import { fetchProgramInfo } from "../utils/fetchProgramInfo";

// Basic pattern for capitalized words + optional colon (e.g., “Planet Earth”)
const programRegex = /\b[A-Z][a-z]+(?:\s[A-Z0-9][a-z0-9]+)+(?=\s*:|$)/g;

export function useProgramDetect(text: string) {
  const [programs, setPrograms] = useState<any[]>([]);

  useEffect(() => {
    if (!text) return;
    const titles = Array.from(new Set(text.match(programRegex) || [])).slice(0, 5);
    Promise.all(titles.map(fetchProgramInfo)).then(setPrograms);
  }, [text]);

  return programs;
}
