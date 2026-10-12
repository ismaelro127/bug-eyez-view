import { useEffect, useState } from 'react';
import SmartVideoPlayer from './SmartVideoPlayer';
import { Channel } from '../../types';

function isRestricted(ch: Channel): boolean {
  const blocklist = [
    'starz', 'encore', 'hbo', 'showtime', 'cinemax', 'epix', 'ppv',
    'espn', 'adult', 'xxx', 'playboy', 'spice', 'bet+', 'bein', 'fox sports',
  ];
  const name = ch.name.toLowerCase().replace(/[^a-z0-9\s]/gi, '');
  return blocklist.some(term => name.includes(term));
}

export default function AdminGuidePage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, setSelected] = useState<Channel | null>(null);

  useEffect(() => {
    fetch('/final_clean_channels.json')
      .then((res) => res.json())
      .then((data) => {
        setChannels(data);
        if (data.length > 0) setSelected(data[0]);
      });
  }, []);

  return (
    <div className="flex h-screen bg-black">
      <div className="w-[300px] bg-zinc-900 text-white overflow-y-auto border-r border-gray-800">
        <h2 className="p-4 text-lg font-bold border-b border-gray-700">🛠️ Admin: All Channels</h2>
        {channels.map((ch) => (
          <div
            key={ch.id}
            className={`p-3 cursor-pointer border-b border-gray-800 hover:bg-zinc-800 ${
              selected?.id === ch.id ? 'bg-yellow-700 font-bold' : ''
            }`}
            onClick={() => setSelected(ch)}
          >
            <div className="truncate">
              {ch.name}
              {isRestricted(ch) && <span className="ml-2 text-yellow-400 text-xs">⚠️ Restricted</span>}
            </div>
            {ch.number && <div className="text-sm text-gray-400">#{ch.number}</div>}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-hidden">
        {selected ? (
<SmartVideoPlayer channel={selected} source="sidebar" />        ) : (
          <div className="text-white p-8">Select a channel to begin.</div>
        )}
      </div>
    </div>
  );
}
