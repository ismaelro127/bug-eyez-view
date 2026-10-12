module.exports = {
  runtimeCaching: [
    {
      // Allow all proxy requests to bypass caching/service worker entirely
      urlPattern: /\/proxy/i,
      handler: "NetworkOnly",
      options: {
        cacheName: "proxy-bypass",
      },
    },
    {
      // Allow HLS master playlists
      urlPattern: /\.(m3u8)$/i,
      handler: "NetworkOnly",
      options: {
        cacheName: "hls-manifests",
      },
    },
    {
      // Allow HLS segments
      urlPattern: /\.(ts|aac|mp4)$/i,
      handler: "NetworkOnly",
      options: {
        cacheName: "hls-segments",
      },
    },
  ],
};
