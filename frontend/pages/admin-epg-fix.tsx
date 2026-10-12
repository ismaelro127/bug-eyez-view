// pages/admin-bugz_showtimes-fix.tsx
import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { useRouter } from 'next/router';
import { logger } from '../web/utils/logger';

interface Bugz_ShowtimesMatch {
  channel_name: string;
  best_guess: string;
  similarity_score: number;
}

interface OverrideMap {
  [channel: string]: string; // channel_name => bugz_showtimes_id
}

export default function AdminBugz_ShowtimesFix() {
  const router = useRouter();
  const [unmatched, setUnmatched] = useState<Bugz_ShowtimesMatch[]>([]);
  const [bugz_showtimesOptions, setEpgOptions] = useState<string[]>([]);
  const [overrides, setOverrides] = useState<OverrideMap>({});

  // Auth check
  useEffect(() => {
  const checkAuth = async () => {
    const token = sessionStorage.getItem('token');
    if (!token) return router.replace('/login');

    try {
      const decoded: any = jwtDecode(token);
      if (decoded.role !== 'admin') return router.replace('/');
    } catch (e) {
      return router.replace('/login');
    }
  };

  checkAuth();
}, []);


  useEffect(() => {
    fetch('/better_fuzzy_unmatched.json')
      .then((res) => res.json())
      .then(setUnmatched);

    fetch('/bugz_showtimes/all_bugz_showtimes_names.json') // extracted list of bugz_showtimes display-names
      .then((res) => res.json())
      .then(setEpgOptions);

    fetch('/bugz_showtimes/manual_overrides.json')
      .then((res) => res.json())
      .then(setOverrides)
      .catch(() => setOverrides({}));
  }, []);

  const updateOverride = (channel: string, bugz_showtimesId: string) => {
    const updated = { ...overrides, [channel]: bugz_showtimesId };
    setOverrides(updated);

    fetch('/api/save-bugz_showtimes-override', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch((err) => logger.error('Failed to save override', err));
  };

  return (
    <div className="p-4 text-white">
      <h2 className="text-2xl font-bold mb-4">🔧 Manual Bugz_Showtimes Fix Tool</h2>
      <table className="w-full text-sm border-collapse border border-gray-700">
        <thead>
          <tr className="bg-gray-800">
            <th className="p-2 border">Channel Name</th>
            <th className="p-2 border">Best Guess</th>
            <th className="p-2 border">Override Match</th>
          </tr>
        </thead>
        <tbody>
          {unmatched.map((item) => (
            <tr key={item.channel_name}>
              <td className="p-2 border">{item.channel_name}</td>
              <td className="p-2 border text-yellow-300">{item.best_guess}</td>
              <td className="p-2 border">
                <select
                  className="bg-black border border-gray-600 text-white p-1"
                  value={overrides[item.channel_name] || ''}
                  onChange={(e) => updateOverride(item.channel_name, e.target.value)}
                >
                  <option value="">-- Select Bugz_Showtimes Match --</option>
                  {bugz_showtimesOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
