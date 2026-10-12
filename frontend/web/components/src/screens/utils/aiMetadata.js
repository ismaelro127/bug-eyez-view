// Simulated metadata fetcher — ready for AI plugin
export const extractMetadataFromUri = async (uri) => {
  // Later: auto-fetch from Whisper / TMDB
  return {
    title: uri.includes('mux') ? "Sample Stream" : "Unknown Video",
    genre: "Drama",
    duration: "1h 42m"
  };
};
