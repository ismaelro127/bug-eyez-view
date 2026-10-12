"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { logger } from "./../utils/logger";
import {
  epgMinutes,
  formatEPGTime,
  sortByEPGTime,
} from "../../shared/utils/epgTime";

type EPGItem = {
  channel?: string;
  title: string;
  description?: string;
  category?: string;
  thumbnail?: string;
  start_utc: string;
  stop_utc: string;
  year?: number | string | null;
};

type NowNextBannerProps = {
  channelId: string;
  epgUrl?: string;
  aiSummaryEndpoint?: string;

  /** Mobile external visibility trigger */
  forceShow?: boolean;
};

type NowNextState = {
  now?: EPGItem;
  next?: EPGItem;
};

const HOLO_BG =
  "backdrop-blur-xl bg-slate-900/40 border border-cyan-300/40 shadow-[0_0_25px_rgba(34,211,238,0.4)]";

const slideVariants = {
  hidden: { x: -40, opacity: 0 },
  visible: { x: 0, opacity: 1 },
  exit: { x: -40, opacity: 0 },
};

function getNowNext(epg: EPGItem[]): NowNextState {
  if (!epg || epg.length === 0) return {};

  const sorted = sortByEPGTime(epg) as EPGItem[];

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  let nowProgram: EPGItem | undefined;
  let nextProgram: EPGItem | undefined;

  for (let i = 0; i < sorted.length; i++) {
    const start = epgMinutes(sorted[i]);
    const nextStart =
      i + 1 < sorted.length ? epgMinutes(sorted[i + 1]) : -1;

    if (start <= nowMin && (nextStart === -1 || nowMin < nextStart)) {
      nowProgram = sorted[i];

      if (i + 1 < sorted.length) {
        nextProgram = sorted[i + 1];
      }

      break;
    }

    if (!nowProgram && start > nowMin) {
      nextProgram = sorted[i];
      break;
    }
  }

  return { now: nowProgram, next: nextProgram };
}

function normalizeTimestamp(program: any, field: "start" | "stop") {
  const toISOFromLocalTime = (t?: string) => {
    if (!t || !t.includes(":")) return "";

    const [h, m] = t.split(":").map(Number);
    const d = new Date();

    d.setHours(h || 0, m || 0, 0, 0);

    return d.toISOString();
  };

  if (field === "start") {
    return (
      program.start_utc ||
      program.start_utc_xml ||
      program.start_iso ||
      program.start ||
      toISOFromLocalTime(program.time_local) ||
      ""
    );
  }

  return (
    program.stop_utc ||
    program.stop_utc_xml ||
    program.end_utc_xml ||
    program.stop ||
    program.end ||
    ""
  );
}

export default function NowNextBanner({
  channelId,
  epgUrl,
  aiSummaryEndpoint,
  forceShow = false,
}: NowNextBannerProps) {
  const [epg, setEpg] = useState<EPGItem[]>([]);
  const [nowNext, setNowNext] = useState<NowNextState>({});
  const [showNow, setShowNow] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const effectiveEpgUrl = epgUrl || `/epg/${channelId}.json`;

  const nowProgram = nowNext.now;
  const nextProgram = nowNext.next;

  const nowKeyForAI = useMemo(() => {
    if (!nowProgram) return null;

    return `${channelId}:${nowProgram.title}:${nowProgram.start_utc}`;
  }, [channelId, nowProgram]);

  // Load EPG.
  useEffect(() => {
    let cancelled = false;

    async function loadEPG() {
      try {
        const res = await fetch(effectiveEpgUrl, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          logger.warn("EPG load rejected:", res.status, effectiveEpgUrl);
          return;
        }

        const raw = await res.json().catch(() => null);

        if (cancelled) return;

        const list: any[] = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.programs)
          ? raw.programs
          : [];

        const normalized: EPGItem[] = list
          .map((program: any) => ({
            ...program,
            title: program.title || "Untitled",
            start_utc: normalizeTimestamp(program, "start"),
            stop_utc: normalizeTimestamp(program, "stop"),
          }))
          .filter((program) => program.start_utc && program.title);

        setEpg(normalized);
      } catch (err) {
        logger.warn("EPG load error:", err);
      }
    }

    loadEPG();

    return () => {
      cancelled = true;
    };
  }, [effectiveEpgUrl]);

  // Compute NOW / NEXT every 30 seconds.
  useEffect(() => {
    if (epg.length === 0) {
      setNowNext({});
      setShowNow(false);
      setShowNext(false);
      return;
    }

    const update = () => {
      const result = getNowNext(epg);

      setNowNext(result);
      setShowNow(Boolean(result.now));
      setShowNext(Boolean(result.next));
    };

    update();

    const interval = window.setInterval(update, 30000);

    return () => {
      window.clearInterval(interval);
    };
  }, [epg]);

  // AI Summary.
  useEffect(() => {
    if (!aiSummaryEndpoint || !nowProgram || !nowKeyForAI) return;

    let cancelled = false;

    async function fetchSummary() {
      try {
        setLoadingSummary(true);
        setAiSummary(null);

        const params = new URLSearchParams({
          title: nowProgram?.title ?? "",
          channelId,
        });

        if (nowProgram?.year) {
          params.append("year", String(nowProgram.year));
        }

        const res = await fetch(`${aiSummaryEndpoint}?${params.toString()}`, {
          method: "GET",
          credentials: "include",
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          logger.warn("AI summary request rejected:", res.status, data);
          return;
        }

        if (!cancelled && data?.summary) {
          setAiSummary(data.summary);
        }
      } catch (err) {
        logger.warn("AI summary error:", err);
      } finally {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      }
    }

    fetchSummary();

    return () => {
      cancelled = true;
    };
  }, [aiSummaryEndpoint, nowProgram, nowKeyForAI, channelId]);

  // External mobile force-show.
  useEffect(() => {
    if (!forceShow) return;

    setShowNow(true);
    setShowNext(true);

    const id = window.setTimeout(() => {
      setShowNow(false);
      setShowNext(false);
    }, 5000);

    return () => {
      window.clearTimeout(id);
    };
  }, [forceShow]);

  return (
    <div className="pointer-events-none fixed left-6 bottom-8 z-[90] flex flex-col gap-3">
      {/* NOW PLAYING */}
      <AnimatePresence>
        {nowProgram && showNow && (
          <motion.div
            key={nowKeyForAI || nowProgram.title}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={slideVariants}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className={`${HOLO_BG} pointer-events-auto rounded-2xl px-5 py-3 flex items-start gap-3`}
          >
            <div className="h-10 w-1 rounded-full bg-cyan-300/80 shadow-[0_0_20px_rgba(34,211,238,0.9)]" />

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-cyan-200/80">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Now Playing
              </div>

              <div className="text-sm sm:text-base font-semibold text-cyan-50 drop-shadow">
                {nowProgram.title}

                {nowProgram.year && (
                  <span className="text-cyan-200/80 text-xs ml-2">
                    ({nowProgram.year})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-[11px] sm:text-xs text-cyan-100/70">
                {formatEPGTime(nowProgram.start_utc, nowProgram)}

                {nowProgram.category && (
                  <>
                    <span className="opacity-40">•</span>
                    <span>{nowProgram.category}</span>
                  </>
                )}
              </div>

              {(aiSummary || nowProgram.description) && (
                <div className="mt-1 text-[11px] text-cyan-50/80 max-w-md line-clamp-3">
                  {aiSummary || nowProgram.description}
                </div>
              )}

              {loadingSummary && !aiSummary && (
                <div className="mt-1 text-[10px] text-cyan-200/60">
                  Calibrating AI overview…
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NEXT UP */}
      <AnimatePresence>
        {nextProgram && showNext && (
          <motion.div
            key={`next_${nextProgram.title}_${nextProgram.start_utc}`}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={slideVariants}
            transition={{
              duration: 0.35,
              ease: "easeInOut",
              delay: 0.05,
            }}
            className={`${HOLO_BG} pointer-events-auto rounded-2xl px-5 py-2 flex items-start gap-3`}
          >
            <div className="h-8 w-[3px] rounded-full bg-amber-300/90 shadow-[0_0_16px_rgba(252,211,77,0.9)]" />

            <div className="flex flex-col gap-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-amber-200/80">
                Next Up
              </div>

              <div className="text-xs sm:text-sm font-semibold text-amber-50">
                {nextProgram.title}
              </div>

              <div className="text-[10px] sm:text-[11px] text-amber-100/80">
                Starts at {formatEPGTime(nextProgram.start_utc, nextProgram)}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}