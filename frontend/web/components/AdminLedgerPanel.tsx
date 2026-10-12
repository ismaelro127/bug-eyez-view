import { useState } from "react";
import { apiFetch } from "../../lib/apiFetch";

export default function AdminLedgerPanel() {
  const [userId, setUserId] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadLedger() {
    try {
      setError(null);
const res = await apiFetch(`/api/admin/ledger/${userId}`, {
  method: "GET",
});

const json = await res.json().catch(() => null);

if (!res.ok) {
  throw new Error(json?.error || "Failed to load ledger");
}

setData(json);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="p-4 text-sm">
      <h2 className="text-lg font-bold mb-2">Admin Ledger Audit</h2>

      <input
        className="border p-1 mr-2"
        placeholder="User ID"
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
      />

      <button onClick={loadLedger} className="px-3 py-1 bg-black text-white">
        Load
      </button>

      {error && <div className="text-red-500 mt-2">{error}</div>}

      {data && (
        <>
          <div className="mt-4">
            <strong>Ledger Verification:</strong>{" "}
            {data.verification.ok ? "OK ✅" : "FAILED ❌"}
          </div>

          <pre className="mt-2 max-h-96 overflow-auto bg-gray-100 p-2">
            {JSON.stringify(data.ledger, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
