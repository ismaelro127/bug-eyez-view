import React, { useEffect, useState } from "react";
import { Channel } from "../../types";

interface Program {
  title: string;
  start: string;
  end: string;
}

interface Props {
  channels: Channel[];
  onChannelSelect: (ch: Channel) => void;
  holo?: boolean;
  refreshing?: boolean; // 👈 add this prop

}

const EPGGrid: React.FC<Props> = ({ channels, onChannelSelect, holo = false }) => {
  const [schedule, setSchedule] = useState<Record<string, Program[]>>({});
  const [timeline, setTimeline] = useState<string[]>([]);

  useEffect(() => {
    const now = new Date();
    const hours: string[] = [];
    for (let i = 0; i < 6; i++) {
      const t = new Date(now.getTime() + i * 60 * 60 * 1000);
      hours.push(t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    }
    setTimeline(hours);
  }, []);

  useEffect(() => {
    if (!channels || channels.length === 0) return;

    const now = new Date();
    channels.forEach((ch) => {
      fetch(`/epg/${ch.id}.json`)
        .then((res) => (res.ok ? res.json() : { programs: [] }))
        .then((data) => {
          const progs = (data.programs || []).map((p: any) => ({
            title: p.title || "No Title",
            start: p.start,
            end: p.end,
          }));
          setSchedule((prev) => ({ ...prev, [ch.id]: progs }));
        })
        .catch(() => {
          // placeholder if no EPG found
          const temp: Program[] = Array.from({ length: 6 }).map((_, i) => {
            const start = new Date(now.getTime() + i * 60 * 60 * 1000);
            const end = new Date(start.getTime() + 60 * 60 * 1000);
            return {
              title: "No schedule available",
              start: start.toISOString(),
              end: end.toISOString(),
            };
          });
          setSchedule((prev) => ({ ...prev, [ch.id]: temp }));
        });
    });
  }, [channels]);

  const isNowPlaying = (prog: Program) => {
    const now = new Date();
    const start = prog.start ? new Date(prog.start) : null;
    const end = prog.end ? new Date(prog.end) : null;
    return start && end && now >= start && now < end;
  };

  return (
      <div className="h-full w-full overflow-y-auto text-white rounded-lg">
      <div className="min-w-max overflow-x-auto">
        {/* Timeline header */}
        <div
          className={`grid sticky top-0 z-10 border-b border-gray-700 ${
            holo ? "holo-panel holo-glow" : "bg-zinc-900"
          }`}
          style={{ gridTemplateColumns: `280px repeat(${timeline.length}, 200px)` }}
        >
          <div className="p-2 font-bold">Channel</div>
          {timeline.map((time, i) => (
            <div
              key={i}
              className="p-2 text-sm font-semibold text-center border-l border-gray-700"
            >
              {time}
            </div>
          ))}
        </div>

        {/* Channel rows */}
        {channels.map((ch) => {
          const progs = (schedule[ch.id] || []).slice(0, timeline.length);

          return (
            <div
              key={ch.id}
              className={`grid border-b border-gray-800 transition-colors duration-150 ${
                holo ? "holo-panel holo-glow" : "hover:bg-zinc-800"
              }`}
              style={{ gridTemplateColumns: `280px repeat(${timeline.length}, 200px)` }}
            >
              {/* Channel cell (click to select) */}
              <button
                onClick={() => onChannelSelect(ch)}
                className="p-2 text-left font-semibold cursor-pointer hover:text-emerald-300 focus:outline-none"
                title="Select channel"
              >
                <div>{ch.name}</div>
                <div className="text-xs text-gray-400">
                  {ch.genre || "Uncategorized"} • {ch.language || "Unknown"}
                </div>
              </button>

              {/* Program cells */}
              {progs.map((prog, i) => {
                const start = prog.start
                  ? new Date(prog.start).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                  : "";
                const end = prog.end
                  ? new Date(prog.end).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
                  : "";

                const playingNow = isNowPlaying(prog);

                return (
                  <div
                    key={`${ch.id}-${i}`}
                    className={`p-2 text-sm truncate border-l border-gray-700 ${
                      playingNow ? "bg-emerald-800 text-white" : ""
                    }`}
                    title={`${prog.title}\n${start} - ${end}`}
                  >
                    <div className="font-medium">{prog.title}</div>
                    <div className="text-xs text-gray-400">{start} - {end}</div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EPGGrid;
