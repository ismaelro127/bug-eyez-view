import React, { useEffect, useState } from "react";

const DynamicEntityCard: React.FC<{ entity: { type: string; id: string } }> = ({ entity }) => {
  const [info, setInfo] = useState<any>(null);

  useEffect(() => {
    fetch(`/ai/entity/${entity.type}/${entity.id}`)
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ error: true }));
  }, [entity]);

  if (!info) return <div className="text-white/50 text-sm">Loading {entity.type} info…</div>;
  if (info.error) return <div className="text-red-400 text-sm">Failed to load info.</div>;

  return (
    <div className="p-3 rounded-lg bg-white/10 border border-white/20">
      <h3 className="font-semibold text-lg">{info.name}</h3>
      <p className="text-sm text-white/70">{info.description}</p>

      {info.links?.map((l: any) => (
        <a
          key={l.url}
          href={l.url}
          target="_blank"
          rel="noreferrer"
          className="block text-xs text-cyan-400 hover:text-cyan-200 mt-2"
        >
          {l.label}
        </a>
      ))}
    </div>
  );
};

export default DynamicEntityCard;
