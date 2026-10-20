export function getDeviceHash(): string {
  const KEY = "bugeyez_device_id";

  let id = localStorage.getItem(KEY);
  if (!id) {
    id =
  typeof window.crypto?.randomUUID === "function"
    ? window.crypto.randomUUID()
    : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(KEY, id);
  }

  return id;
}
