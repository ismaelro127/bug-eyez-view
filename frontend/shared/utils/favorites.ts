export function loadFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem("favoriteChannels") || "[]");
  } catch {
    return [];
  }
}

export function saveFavorites(ids: string[]) {
  localStorage.setItem("favoriteChannels", JSON.stringify(ids));
}
