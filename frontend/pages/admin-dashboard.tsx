import { useEffect, useState } from "react";
import AdminRoutesPage from "./admin/AdminRoutesPage";

export default function AdminDashboard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <AdminRoutesPage />;
}
