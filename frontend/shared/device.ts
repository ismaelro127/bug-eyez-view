export function getDeviceHash(): string {
  const KEY = "bugeyez_device_id";

  let id = localStorage.getItem(KEY);
  if (!id) {
    id = window.crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }

  return id;
}
