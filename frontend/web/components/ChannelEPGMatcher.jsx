useEffect(() => {
  if (!API) {
    logger.warn(
      "NEXT_PUBLIC_API_URL is not configured. Socket.IO connection skipped."
    );
    return;
  }

  const socket = io(API, {
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    logger.info("Socket connected:", socket.id);
  });

  const handler = (payload: any) => {
    if (!payload) return;

    if (
      typeof payload === "object" &&
      !payload.channel_id
    ) {
      setChannelHealth((prev) => ({
        ...prev,
        ...payload,
      }));
      return;
    }

    if (payload.channel_id) {
      setChannelHealth((prev) => ({
        ...prev,
        [payload.channel_id]: payload,
      }));
    }
  };

  socket.on("channelHealth:update", handler);
  socket.on("channel-health-update", handler);

  return () => {
    socket.off(
      "channelHealth:update",
      handler
    );

    socket.off(
      "channel-health-update",
      handler
    );

    socket.disconnect();
  };
}, [API]);