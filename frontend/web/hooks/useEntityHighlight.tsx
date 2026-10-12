import React, { useEffect, useState } from "react";
import { logger } from "../utils/logger";
import { apiFetch } from "../../lib/apiFetch";

interface Entity {
  name: string;
  type: string;
}


export const useEntityHighlight = (text: string) => {
  const [processed, setProcessed] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    if (!text) {
      setProcessed([]);
      return;
    }

    let cancelled = false;

    const fetchEntities = async () => {
      try {
        const response = await apiFetch(
  "/ai/entities",
  {
    method: "POST",
    body: JSON.stringify({
      text,
    }),
  }
);

        if (!response.ok) {
          throw new Error(`AI entities request failed: ${response.status}`);
        }

        const data: Entity[] = await response.json();

        if (cancelled) return;

        const tokens = text.split(/(\s+)/);

        const highlighted = tokens.map((word, i) => {
          const entity = data.find((e) =>
            word.toLowerCase().includes(e.name.toLowerCase())
          );

          if (entity) {
            return (
              <span
                key={i}
                data-entity={entity.name}
                className="text-emerald-300 hover:text-emerald-100 cursor-pointer transition"
                onClick={() => {
                  const event = new CustomEvent("show-entity-tooltip", {
                    detail: entity,
                  });

                  window.dispatchEvent(event);
                }}
              >
                {word}
              </span>
            );
          }

          return <span key={i}>{word}</span>;
        });

        setProcessed(highlighted);
      } catch (err) {
        logger.error("Entity detection failed:", err);

        if (!cancelled) {
          setProcessed([<span key="fallback">{text}</span>]);
        }
      }
    };

    fetchEntities();

    return () => {
      cancelled = true;
    };
  }, [text]);

  return processed;
};