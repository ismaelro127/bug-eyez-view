// pages/admin-channels.tsx
import React, { useEffect, useState } from 'react';
import { jwtDecode } from 'jwt-decode';import { useRouter } from 'next/router';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '../web/utils/logger';

interface AdminEntry {
  name: string;
  url: string;
  status: 'online' | 'offline';
  last_checked: string;
  retry_count: number;
  was_previously_offline?: boolean;
}

export default function AdminChannels() {
  const router = useRouter();
  const [channels, setChannels] = useState<Record<string, AdminEntry>>({});

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
    fetch('/royal_decrees.json')
      .then((res) => res.json())
      .then(setChannels)
      .catch((err) => logger.error('Failed to load admin_channels.json', err));
  }, []);

  const entries = Object.entries(channels);

  return (
    <div className="p-4 text-white">
      <h2 className="text-2xl font-bold mb-4">📡 Channel Status Overview</h2>
      <table className="w-full text-sm border-collapse border border-gray-700">
        <thead>
          <tr className="bg-gray-800">
            <th className="p-2 border">Channel</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Last Checked</th>
            <th className="p-2 border">Retries</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([id, entry]) => (
            <tr
              key={id}
              className={
                entry.status === 'offline'
                  ? 'bg-red-900'
                  : entry.retry_count > 0
                  ? 'bg-yellow-900'
                  : 'bg-green-900'
              }
            >
              <td className="p-2 border">{entry.name}</td>
              <td className="p-2 border">{entry.status}</td>
              <td className="p-2 border">
                {formatDistanceToNow(new Date(entry.last_checked), { addSuffix: true })}
              </td>
              <td className="p-2 border text-center">{entry.retry_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
