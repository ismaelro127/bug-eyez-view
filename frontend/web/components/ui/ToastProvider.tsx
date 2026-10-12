"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type ToastType =
  | "success"
  | "error"
  | "info"
  | "warning";

type ToastOptions = {
  title?: string;
  durationMs?: number;
  prominent?: boolean;
};

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  prominent?: boolean;
};

type ToastContextValue = {
  showToast: (
    message: string,
    type?: ToastType,
    options?: ToastOptions
  ) => void;

  removeToast: (id: string) => void;
  clearToasts: () => void;
};

const ToastContext =
  createContext<ToastContextValue | null>(null);

function createToastId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function getToastColors(type: ToastType) {
  switch (type) {
    case "success":
      return {
        border:
          "var(--bug-accent-border, rgba(34,211,238,0.75))",
        color: "var(--bug-accent, #22d3ee)",
        glow:
          "var(--bug-glow, 0 0 28px rgba(34,211,238,0.35))",
      };

    case "error":
      return {
        border: "rgba(248,113,113,0.85)",
        color: "#fecaca",
        glow:
          "0 0 28px rgba(248,113,113,0.45)",
      };

    case "warning":
      return {
        border: "rgba(251,191,36,0.85)",
        color: "#fde68a",
        glow:
          "0 0 28px rgba(251,191,36,0.38)",
      };

    default:
      return {
        border: "rgba(147,197,253,0.8)",
        color: "#dbeafe",
        glow:
          "0 0 28px rgba(147,197,253,0.3)",
      };
  }
}

function getToastIcon(type: ToastType) {
  switch (type) {
    case "success":
      return "✓";
    case "error":
      return "✕";
    case "warning":
      return "!";
    default:
      return "i";
  }
}

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>(
    []
  );

 const timersRef = useRef<Map<string, number>>(
  new Map()
);

  useEffect(() => {
    setMounted(true);

    return () => {
      timersRef.current.forEach((timer) => {
        clearTimeout(timer);
      });

      timersRef.current.clear();
    };
  }, []);

  const removeToast = useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id);

      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }

      setToasts((current) =>
        current.filter((toast) => toast.id !== id)
      );
    },
    []
  );

  const clearToasts = useCallback(() => {
    timersRef.current.forEach((timer) => {
      clearTimeout(timer);
    });

    timersRef.current.clear();
    setToasts([]);
  }, []);

  const showToast = useCallback(
  (
    message: string,
    type: ToastType = "info",
    options: ToastOptions = {}
  ) => {
    const cleanMessage = String(message || "").trim();

    if (!cleanMessage) return;

    const id = createToastId();

    const durationMs =
      typeof options.durationMs === "number"
        ? Math.max(1500, options.durationMs)
        : 4000;

    setToasts((current) => {
      const next = [
        {
          id,
          type,
          message: cleanMessage,
          title: options.title,
          prominent: options.prominent === true,
        },
        ...current,
      ];

      return next.slice(0, 4);
    });

    const timer = window.setTimeout(() => {
      setToasts((current) =>
        current.filter((toast) => toast.id !== id)
      );

      timersRef.current.delete(id);
    }, durationMs);

    timersRef.current.set(id, timer);
  },
  []
);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      removeToast,
      clearToasts,
    }),
    [showToast, removeToast, clearToasts]
  );

  const toastUI = (
    <div
      aria-live="polite"
      aria-relevant="additions"
      style={{
        position: "fixed",
        top: 70,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 2147483647,
        width: "calc(100vw - 24px)",
        maxWidth: 480,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => {
        const colors = getToastColors(toast.type);

        return (
          <div
            key={toast.id}
            role={
              toast.type === "error"
                ? "alert"
                : "status"
            }
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "flex-start",
              gap: 12,
              width: "100%",
              padding: "13px 15px",
              borderRadius: 14,
              border: `2px solid ${colors.border}`,
              background: "rgba(0,0,0,0.98)",
              color: colors.color,
              boxShadow: colors.glow,
              fontSize: 14,
              fontWeight: 800,
              lineHeight: 1.4,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <div
              aria-hidden="true"
              style={{
                flexShrink: 0,
                width: 23,
                height: 23,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                border: `1px solid ${colors.border}`,
                color: colors.color,
                fontSize: 14,
                fontWeight: 900,
                lineHeight: 1,
              }}
            >
              {getToastIcon(toast.type)}
            </div>

            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflowWrap: "anywhere",
                color: colors.color,
              }}
            >
              {toast.message}
            </div>

            <button
              type="button"
              aria-label="Close notification"
              onClick={() => removeToast(toast.id)}
              style={{
                flexShrink: 0,
                margin: 0,
                padding: 0,
                width: 24,
                height: 24,
                background: "transparent",
                border: 0,
                color: "rgba(255,255,255,0.72)",
                cursor: "pointer",
                fontSize: 21,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {mounted &&
        typeof document !== "undefined" &&
        createPortal(toastUI, document.body)}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error(
      "useToast must be used inside ToastProvider"
    );
  }

  return context;
}