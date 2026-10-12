import { useEffect, useState } from 'react';
import { logger } from '../../web/utils/logger';

type Bugz_ShowtimesEntry = {
  bugz_showtimes_id: string;
  bugz_showtimes_name: string;
  match_score: number;
};

type Bugz_ShowtimesMap = Record<string, Bugz_ShowtimesEntry>;

export default function useBugz_ShowtimesMap(): Bugz_ShowtimesMap {
  const [bugz_showtimesMap, setEpgMap] = useState<Bugz_ShowtimesMap>({});

  useEffect(() => {
    fetch('/enhanced_channel_bugz_showtimes_map.json')
      .then(res => res.json())
      .then(setEpgMap)
      .catch((err) => {
        logger.error('[Bugz_Showtimes MAP] Failed to load Bugz_Showtimes map:', err);
      });
  }, []);

  return bugz_showtimesMap;
}
