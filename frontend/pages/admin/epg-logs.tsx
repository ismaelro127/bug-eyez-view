import { useEffect, useState } from 'react';

export default function Bugz_ShowtimesLogs() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetch('/admin-data/bugz_showtimes_dedup_log.json') // Future log source
      .then(res => res.json())
      .then(setLogs)
      .catch(() => setLogs(["❌ No log data found. Make sure bugz_showtimes_dedup_log.json exists."]));
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-4">📄 Bugz_Showtimes Deduplication Logs</h1>
      <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm max-h-[80vh] overflow-y-auto">
        {logs.map((line, i) => (
          <div key={i} className={line.includes('⚠️') ? 'text-yellow-400' : 'text-gray-300'}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}
