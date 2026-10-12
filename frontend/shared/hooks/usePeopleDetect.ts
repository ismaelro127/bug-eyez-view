import { useEffect, useState } from "react";
import { fetchPersonInfo } from "../utils/fetchPersonInfo";

// naive regex for capitalized words (can be replaced by AI later)
const nameRegex = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)+\b/g;

export function usePeopleDetect(text: string) {
  const [people, setPeople] = useState<any[]>([]);

  useEffect(() => {
    if (!text) return;
    const names = Array.from(new Set(text.match(nameRegex) || [])).slice(0, 5);
    Promise.all(names.map(fetchPersonInfo)).then(setPeople);
  }, [text]);

  return people;
}
