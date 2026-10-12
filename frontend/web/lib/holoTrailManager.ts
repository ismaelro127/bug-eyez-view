// utils/holoTrailManager.ts
export function spawnColorTrail() {
  let el = document.querySelector(".holo-color-trail") as HTMLElement;
  if (!el) {
    el = document.createElement("div");
    el.className = "holo-color-trail";
    document.body.appendChild(el);
  }
  el.classList.remove("active");
  void el.offsetWidth; // force reflow for restart
  el.classList.add("active");
}
