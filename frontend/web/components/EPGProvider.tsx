import { createContext, useContext, useEffect, useState } from 'react';
import { logger } from "./../utils/logger";

interface EPGItem {
  start: string;
  end: string;
  title: string;
  episode?: string;
  description?: string;
}

const EPGContext = createContext<{
  epgData?: EPGItem[];
  currentProgram?: EPGItem;
  nextProgram?: EPGItem;
}>({});

export function useEPG() {
  return useContext(EPGContext);
}

export function EPGProvider({
  channel,
  children,
}: {
  channel?: { name: string; slug?: string; epg_id?: string };
  children: React.ReactNode;
}) {
  const [epgData, setEpgData] = useState<EPGItem[]>();
  const [currentProgram, setCurrentProgram] = useState<EPGItem>();
  const [nextProgram, setNextProgram] = useState<EPGItem>();

  useEffect(() => {
    setCurrentProgram(undefined);
    setNextProgram(undefined);
    setEpgData(undefined);

    if (!channel) return;

    // ✅ Prefer epg_id (numeric files), fallback to slug
    const epgUrl = channel.epg_id
      ? `/epg/${channel.epg_id}.json`
      : channel.slug
      ? `/epg/${channel.slug}.json`
      : null;

    if (!epgUrl) return;

    fetch(epgUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch ${epgUrl}`);
        return res.json();
      })
      .then((data) => {
        const now = new Date();
        const programs = data.programs || [];
        setEpgData(programs);

        let found = false;
        for (let i = 0; i < programs.length; i++) {
          const p = programs[i];
          const start = new Date(
            p.start.replace(
              /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
              '$1-$2-$3T$4:$5:$6Z'
            )
          );
          const end = new Date(
            p.end.replace(
              /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/,
              '$1-$2-$3T$4:$5:$6Z'
            )
          );

          if (now >= start && now < end) {
            setCurrentProgram(p);
            setNextProgram(programs[i + 1] || undefined);
            found = true;
            break;
          }
        }

        if (!found && programs.length > 0) {
          setCurrentProgram(programs[0]);
          setNextProgram(programs[1] || undefined);
        }
      })
      .catch((err) => {
        logger.error('EPG fetch failed:', err);
        setCurrentProgram(undefined);
        setNextProgram(undefined);
        setEpgData(undefined);
      });
  }, [channel?.epg_id, channel?.slug, channel?.name]);

  return (
    <EPGContext.Provider value={{ epgData, currentProgram, nextProgram }}>
      {children}
    </EPGContext.Provider>
  );
}
