import React, { JSX } from "react";
import { ExternalLink, Globe, Newspaper, Youtube, Twitter } from "lucide-react";

interface Props {
  channel: { name: string; officialLinks?: Record<string, string | undefined> };

  onClose: () => void;
}

const ICON_MAP: Record<string, JSX.Element> = {
  website: <Globe size={16} />,
  news: <Newspaper size={16} />,
  youtube: <Youtube size={16} />,
  twitter: <Twitter size={16} />,
};

const HoloLinkOverlay: React.FC<Props> = ({ channel, onClose }) => {
  const links = channel.officialLinks || {};

  return (
    <div className="absolute inset-0 z-50 rounded-xl bg-black/60 backdrop-blur-2xl border border-emerald-400/20 animate-slideInRight shadow-[0_0_40px_rgba(16,185,129,0.25)]">
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40">
        <div className="text-emerald-300 font-semibold text-sm uppercase">
          {channel.name} — Official Links
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition text-sm"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-3 text-sm text-white/90">
        {Object.entries(links).length ? (
          Object.entries(links).map(([key, url]) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 p-3 rounded-lg transition group"
            >
              <span className="text-emerald-300">{ICON_MAP[key] || <ExternalLink size={16} />}</span>
              <span className="group-hover:text-emerald-300 transition capitalize">{key}</span>
              <ExternalLink size={14} className="ml-auto text-gray-500 group-hover:text-emerald-300" />
            </a>
          ))
        ) : (
          <p className="text-gray-400">No verified links available for this channel.</p>
        )}
      </div>
    </div>
  );
};

export default HoloLinkOverlay;
