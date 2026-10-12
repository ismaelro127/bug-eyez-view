import React from 'react';

const EPGProgressBar = ({ start, stop }: { start: string; stop: string }) => {
  const startTime = new Date(start).getTime();
  const endTime = new Date(stop).getTime();
  const now = Date.now();
  const percentage = Math.min(100, Math.max(0, ((now - startTime) / (endTime - startTime)) * 100));

  return (
    <div className="w-full h-2 bg-gray-200 rounded">
      <div className="h-2 bg-green-500 rounded" style={{ width: `${percentage}%` }} />
    </div>
  );
};

export default EPGProgressBar;
