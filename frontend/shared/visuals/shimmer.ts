export const triggerActiveVisuals = () => {
  document.documentElement.style.setProperty("--shimmer-opacity", "0.4");
  document.documentElement.style.setProperty("--shimmer-speed", "3s");

  const w = window as any;

  if (w.__idleTimer) {
    clearTimeout(w.__idleTimer);
  }

  w.__idleTimer = setTimeout(() => {
    document.documentElement.style.setProperty("--shimmer-opacity", "0.8");
    document.documentElement.style.setProperty("--shimmer-speed", "8s");
  }, 2000);
};
