import { useEffect, useState } from "react";

export default function AdminLedgerPage() {
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/ledger", {
      credentials: "include",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load ledger");
        return res.json();
      })
      .then((data) => {
        setLedger(data.ledger || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading ledger…</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>
    </div>
  );
}
