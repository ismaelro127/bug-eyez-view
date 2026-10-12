import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import Papa from "papaparse";
import { apiFetch } from "../../lib/apiFetch";

type StreamLog = {
  url: string;
  recordable?: boolean;
  skipped?: boolean;
  history: { time: string; status: string }[];
};

export default function StreamHistoryViewer() {
  const [logs, setLogs] = useState<StreamLog[]>([]);
  const [recordableOnly, setRecordableOnly] = useState(false);
  const [showSkippedOnly, setShowSkippedOnly] = useState(false);
  const [timeRange, setTimeRange] = useState<"all" | "24h" | "7d">("all");
  const [sortBy, setSortBy] = useState<"uptime" | "downtime" | "recent" | "az">("recent");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
  const loadHistory = async () => {
    try {
      const res = await apiFetch(
        "/stream-history",
        {
          method: "GET",
        }
      );

      const data = await res
        .json()
        .catch(() => null);

      if (!res.ok) {
        console.error(
          "Stream history request failed:",
          res.status,
          data
        );
        return;
      }

      if (!Array.isArray(data)) {
        console.error(
          "Invalid stream history response:",
          data
        );
        return;
      }

      setLogs(data);
    } catch (err) {
      console.error(
        "Stream history load failed:",
        err
      );
    }
  };

  void loadHistory();
}, []);

  const formatDot = (status: string) => (
    <span
      className={`inline-block w-3 h-3 rounded-full mx-1 ${
        status === "up" ? "bg-green-500" : "bg-red-500"
      }`}
    />
  );

  const filterByTimeRange = (history: StreamLog["history"]) => {
    const now = Date.now();
    return history.filter(entry => {
      const time = new Date(entry.time).getTime();
      if (timeRange === "24h") return now - time <= 24 * 60 * 60 * 1000;
      if (timeRange === "7d") return now - time <= 7 * 24 * 60 * 60 * 1000;
      return true;
    });
  };

  const filteredLogs = logs.filter(log =>
    (!recordableOnly || log.recordable === true) &&
    (!showSkippedOnly || log.skipped === true)
  );
  
  const sortedLogs = [...filteredLogs].sort((a, b) => {
  const getUptime = (log: StreamLog) => {
    const entries = filterByTimeRange(log.history);
    const ups = entries.filter(h => h.status === "up").length;
    return entries.length ? ups / entries.length : 0;
  };

  if (sortBy === "uptime") return getUptime(b) - getUptime(a);
  if (sortBy === "downtime") return getUptime(a) - getUptime(b);
  if (sortBy === "az") return a.url.localeCompare(b.url);

  // "recent": sort by last entry timestamp
  const lastA = a.history.length ? new Date(a.history[a.history.length - 1].time).getTime() : 0;
  const lastB = b.history.length ? new Date(b.history[b.history.length - 1].time).getTime() : 0;
  return lastB - lastA;
});

  const start = (currentPage - 1) * itemsPerPage;
  const paginated = sortedLogs.slice(start, start + itemsPerPage);

  function exportHistoryToCSV(data: StreamLog[], filename: string) {
    const flat = data.flatMap(log =>
      log.history.map(h => ({
        URL: log.url,
        Time: new Date(h.time).toLocaleString(),
        Status: h.status.toUpperCase(),
        Recordable: log.recordable ? "Yes" : "No",
        Skipped: log.skipped ? "Yes" : "No"
      }))
    );

    const csv = Papa.unparse(flat);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  }

  function exportHistoryToPDF(data: StreamLog[], filename: string) {
    const doc = new jsPDF();
    const flat = data.flatMap(log =>
      log.history.map(h => [
        log.url,
        new Date(h.time).toLocaleString(),
        h.status.toUpperCase(),
        log.recordable ? "Yes" : "No",
        log.skipped ? "Yes" : "No"
      ])
    );

    autoTable(doc, {
      head: [["URL", "Time", "Status", "Recordable", "Skipped"]],
      body: flat,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(filename);
    }
    function calculateUptime(history: StreamLog["history"]) {
      if (history.length === 0) return "0%";
      const ups = history.filter(h => h.status === "up").length;
      const percent = (ups / history.length) * 100;
      return `${percent.toFixed(0)}%`;
    }

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">📊 Stream Availability History</h1>
<div className="flex gap-2 mt-2">
  <button
    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
    onClick={() => exportHistoryToCSV(filteredLogs, "stream_history.csv")}
  >
   <label className="flex items-center space-x-2">
  <span>↕️ Sort By:</span>
  <select
    value={sortBy}
    onChange={e => setSortBy(e.target.value as any)}
    className="px-2 py-1 border rounded"
  >
    <option value="recent">🕒 Most Recent</option>
    <option value="uptime">📈 Highest Uptime</option>
    <option value="downtime">📉 Lowest Uptime</option>
    <option value="az">🔤 A → Z</option>
  </select>
</label>

    📥 Export CSV
  </button>
  <button
    className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
    onClick={() => exportHistoryToPDF(filteredLogs, "stream_history.pdf")}
  >
    📄 Export PDF
  </button>
</div>

      <div className="flex flex-wrap gap-6 mb-4 items-center">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={recordableOnly}
            onChange={e => setRecordableOnly(e.target.checked)}
          />
          <span>🎥 Show Recordable Only</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showSkippedOnly}
            onChange={e => setShowSkippedOnly(e.target.checked)}
          />
          <span>🟡 Show Unsupported Only</span>
        </label>

        <label className="flex items-center gap-2">
          <span>🕒 Time Range:</span>
          <select
            value={timeRange}
            onChange={e => setTimeRange(e.target.value as "all" | "24h" | "7d")}
            className="px-2 py-1 border rounded"
          >
            <option value="all">All Time</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </label>
      </div>

      {filteredLogs.length === 0 && <p>No matching streams found.</p>}

      <div className="space-y-4">
        {paginated.map((log, i) => (
          <div key={i} className="bg-white p-3 rounded shadow">
            <div className="font-semibold truncate text-blue-800">
  {log.url}
  <span className="ml-2 text-sm text-gray-600">
    — Uptime: {calculateUptime(filterByTimeRange(log.history))}
  </span>
</div>
<div className="mt-6 flex justify-center gap-2">
  <button
    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
    className="px-3 py-1 bg-gray-300 rounded"
    disabled={currentPage === 1}
  >
    ⬅️ Prev
  </button>

  <span className="px-2 text-sm">
    Page {currentPage} of {Math.ceil(sortedLogs.length / itemsPerPage)}
  </span>

  <button
    onClick={() => setCurrentPage(p => p + 1)}
    className="px-3 py-1 bg-gray-300 rounded"
    disabled={start + itemsPerPage >= sortedLogs.length}
  >
    ➡️ Next
  </button>
</div>

            <div className="mt-2 flex flex-wrap items-center">
              {filterByTimeRange(log.history).map((h, idx) => (
                <div key={idx} title={new Date(h.time).toLocaleString()}>
                  {formatDot(h.status)}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
