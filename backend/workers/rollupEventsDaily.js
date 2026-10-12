export async function rollupEventsForDay(
  date = new Date(Date.now() - 24 * 60 * 60 * 1000)
) {
  const day = yyyyMmDd(date);
  const start = new Date(`${day}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const rows = await Event.aggregate([
    {
      $match: {
        createdAt: { $gte: start, $lt: end },
        channel_id: { $exists: true, $ne: null },
        type: {
          $in: [
            "channel-play-started",
            "channel-play-failed",
            "channel-play-stopped",
          ],
        },
      },
    },
    {
      $group: {
        _id: "$channel_id",
        plays: {
          $sum: {
            $cond: [
              { $eq: ["$type", "channel-play-started"] },
              1,
              0,
            ],
          },
        },
        fails: {
          $sum: {
            $cond: [
              { $eq: ["$type", "channel-play-failed"] },
              1,
              0,
            ],
          },
        },
        stops: {
          $sum: {
            $cond: [
              { $eq: ["$type", "channel-play-stopped"] },
              1,
              0,
            ],
          },
        },
        watch_time_sum: {
          $sum: {
            $cond: [
              { $eq: ["$type", "channel-play-stopped"] },
              "$duration_seconds",
              0,
            ],
          },
        },
        watch_time_count: {
          $sum: {
            $cond: [
              { $eq: ["$type", "channel-play-stopped"] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]).allowDiskUse(true);

  if (!rows.length) return { day, upserted: 0 };

  const ops = rows.map((r) => ({
    updateOne: {
      filter: { channel_id: r._id, day },
      update: {
        $set: {
          plays: r.plays || 0,
          fails: r.fails || 0,
          stops: r.stops || 0,
          watch_time_sum: r.watch_time_sum || 0,
          watch_time_count: r.watch_time_count || 0,
        },
        $setOnInsert: {
          channel_id: r._id,
          day,
        },
      },
      upsert: true,
    },
  }));

  await ChannelDailyRollup.bulkWrite(ops, { ordered: false });

  return { day, upserted: ops.length };
}