import { useEffect, useState } from "react";

export function useBalance() {
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/credits/balance")
      .then((r) => r.json())
      .then((data) => setCredits(data.credits))
      .finally(() => setLoading(false));
  }, []);

  return { credits, loading };
}
