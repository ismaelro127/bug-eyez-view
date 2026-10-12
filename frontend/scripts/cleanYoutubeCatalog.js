const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");

const registryPath = path.join(
  root,
  "public",
  "legal_verified_channels.json"
);

const reportPath = path.join(
  root,
  "youtube-catalog-cleanup-report.txt"
);

const channels = JSON.parse(
  fs.readFileSync(registryPath, "utf8")
);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function isYoutube(channel) {
  return (
    channel.delivery === "youtube" ||
    channel.type === "youtube" ||
    channel.category === "YouTube Live" ||
    Boolean(channel.youtubeId) ||
    String(channel.id || "").startsWith("yt_")
  );
}

function getYoutubeId(channel) {
  if (channel.youtubeId) {
    return String(channel.youtubeId).trim();
  }

  if (
    typeof channel.id === "string" &&
    channel.id.startsWith("yt_")
  ) {
    return channel.id.slice(3);
  }

  return null;
}

function looksLikePersistentStream(channel) {
  const text = normalize(channel.name);

  return [
    /24\/7/,
    /24-7/,
    /live radio/,
    /radio/,
    /live cam/,
    /live camera/,
    /webcam/,
    /earthcam/,
    /city cam/,
    /street cam/,
    /airport live/,
    /nest cam/,
    /wildlife cam/,
    /live stream/,
    /livestream/,
    /ambient/,
    /relaxing music/,
    /sleep music/,
    /lofi/,
  ].some((pattern) => pattern.test(text));
}

function looksLikeOneTimeEvent(channel) {
  const text = normalize(channel.name);

  return [
    /\bjanuary\b/,
    /\bfebruary\b/,
    /\bmarch\b/,
    /\bapril\b/,
    /\bmay\b/,
    /\bjune\b/,
    /\bjuly\b/,
    /\baugust\b/,
    /\bseptember\b/,
    /\boctober\b/,
    /\bnovember\b/,
    /\bdecember\b/,

    /\bprimary\b/,
    /\belection rally\b/,
    /\bpress meet\b/,
    /\bbriefing\b/,
    /\bhearing\b/,
    /\btestifies\b/,
    /\blifts off\b/,
    /\blaunches\b/,
    /\bbreaking\b/,
    /\blatest news\b/,
    /\bwar latest\b/,
    /\bdharna live\b/,
    /\bcabinet list\b/,
  ].some((pattern) => pattern.test(text));
}

function runYtDlp(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  const args = [
    "--dump-single-json",
    "--skip-download",
    "--no-warnings",
    "--no-playlist",
    url,
  ];

  let result = spawnSync(
    "yt-dlp",
    args,
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: 30000,
    }
  );

  /*
   * Windows often has yt-dlp.exe instead.
   */
  if (result.error && result.error.code === "ENOENT") {
    result = spawnSync(
      "yt-dlp.exe",
      args,
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: 30000,
      }
    );
  }

  /*
   * Final fallback if installed through Python.
   */
  if (result.error && result.error.code === "ENOENT") {
    result = spawnSync(
      "python",
      [
        "-m",
        "yt_dlp",
        ...args,
      ],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: 30000,
      }
    );
  }

  return result;
}

function classifyYoutubeResult(
  channel,
  result
) {
  const persistent =
    looksLikePersistentStream(channel);

  const oneTime =
    looksLikeOneTimeEvent(channel);

  if (result.error) {
    return {
      state: "UNKNOWN",
      reason: result.error.message,
      persistent,
      oneTime,
    };
  }

  const stderr = String(
    result.stderr || ""
  );

  const combined = stderr.toLowerCase();

  /*
   * Only treat definitive YouTube failures as dead.
   */
  const definitelyUnavailable =
    combined.includes("video unavailable") ||
    combined.includes("this video is private") ||
    combined.includes("private video") ||
    combined.includes("has been removed") ||
    combined.includes("video has been removed") ||
    combined.includes("this video has been removed") ||
    combined.includes("account associated with this video has been terminated") ||
    combined.includes("this live stream recording is not available");

  if (
    result.status !== 0 &&
    definitelyUnavailable
  ) {
    return {
      state: "DEAD",
      reason:
        stderr.trim() ||
        "YouTube reports video unavailable",
      persistent,
      oneTime,
    };
  }

  if (
    result.status !== 0 ||
    !result.stdout
  ) {
    return {
      state: "UNKNOWN",
      reason:
        stderr.trim() ||
        `yt-dlp exited with ${result.status}`,
      persistent,
      oneTime,
    };
  }

  let data;

  try {
    data = JSON.parse(result.stdout);
  } catch (error) {
    return {
      state: "UNKNOWN",
      reason: "Could not parse yt-dlp JSON",
      persistent,
      oneTime,
    };
  }

  const liveStatus = normalize(
    data.live_status
  );

  const isLive = data.is_live === true;

  const wasLive =
    data.was_live === true;

  const availability = normalize(
    data.availability
  );

  if (
    availability === "private" ||
    availability === "subscriber_only"
  ) {
    return {
      state: "DEAD",
      reason: `availability=${availability}`,
      persistent,
      oneTime,
      data,
    };
  }

  if (
    isLive ||
    liveStatus === "is_live"
  ) {
    return {
      state: "LIVE_NOW",
      reason: "Currently live",
      persistent,
      oneTime,
      data,
    };
  }

  if (
    liveStatus === "is_upcoming"
  ) {
    return {
      state: "UPCOMING",
      reason: "Upcoming livestream",
      persistent,
      oneTime,
      data,
    };
  }

  /*
   * An ended livestream should only be removed automatically
   * when it also looks like a one-time event.
   *
   * This prevents deleting persistent channels whose stream
   * URL may be temporarily between broadcasts.
   */
  if (
    liveStatus === "was_live" ||
    wasLive
  ) {
    if (
      oneTime &&
      !persistent
    ) {
      return {
        state: "ENDED_ONE_TIME",
        reason: "Ended livestream + one-time event title",
        persistent,
        oneTime,
        data,
      };
    }

    return {
      state: "VIDEO_EXISTS_NOT_LIVE",
      reason: "Previous livestream still exists",
      persistent,
      oneTime,
      data,
    };
  }

  /*
   * Normal video / replay still exists.
   */
  return {
    state: "VIDEO_EXISTS_NOT_LIVE",
    reason:
      liveStatus ||
      "Video exists but is not currently live",
    persistent,
    oneTime,
    data,
  };
}

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function main() {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const backupPath =
    `${registryPath}.youtube-cleanup-backup-${timestamp}`;

  fs.copyFileSync(
    registryPath,
    backupPath
  );

  console.log("");
  console.log("=================================");
  console.log(" BUG EYEZ VIEW YOUTUBE CLEANUP");
  console.log("=================================");
  console.log("");
  console.log(`Backup: ${backupPath}`);

  const youtubeChannels =
    channels.filter(isYoutube);

  console.log(
    `YouTube channels to verify: ${youtubeChannels.length}`
  );

  const results = [];

  let index = 0;

  for (const channel of youtubeChannels) {
    index += 1;

    const videoId =
      getYoutubeId(channel);

    process.stdout.write(
      `[${index}/${youtubeChannels.length}] ${channel.id} ... `
    );

    if (!videoId) {
      results.push({
        channel,
        videoId: null,
        state: "UNKNOWN",
        reason: "No YouTube video ID",
      });

      console.log("UNKNOWN");
      continue;
    }

    /*
     * Confirmed duplicate from previous audit.
     */
    if (
      channel.id === "yt_C96oohpWBGw"
    ) {
      results.push({
        channel,
        videoId,
        state: "DUPLICATE",
        reason:
          "Duplicate of curated livenow_fox entry",
      });

      console.log("DUPLICATE");
      continue;
    }

    const rawResult =
      runYtDlp(videoId);

    const classification =
      classifyYoutubeResult(
        channel,
        rawResult
      );

    results.push({
      channel,
      videoId,
      ...classification,
    });

    console.log(
      classification.state
    );

    /*
     * Small delay so we don't hammer YouTube.
     */
    await sleep(300);
  }

  const removeStates = new Set([
    "DUPLICATE",
    "DEAD",
    "ENDED_ONE_TIME",
  ]);

  const removeIds = new Set(
    results
      .filter((item) =>
        removeStates.has(item.state)
      )
      .map((item) =>
        item.channel.id
      )
  );

  const keptChannels =
    channels.filter(
      (channel) =>
        !removeIds.has(channel.id)
    );

  fs.writeFileSync(
    registryPath,
    `${JSON.stringify(
      keptChannels,
      null,
      2
    )}\n`,
    "utf8"
  );

  const counts = {};

  for (const item of results) {
    counts[item.state] =
      (counts[item.state] || 0) + 1;
  }

  const lines = [];

  lines.push(
    "================================="
  );

  lines.push(
    " BUG EYEZ VIEW YOUTUBE CLEANUP REPORT"
  );

  lines.push(
    "================================="
  );

  lines.push("");
  lines.push(`Backup: ${backupPath}`);
  lines.push(
    `Starting registry channels: ${channels.length}`
  );

  lines.push(
    `YouTube channels checked: ${youtubeChannels.length}`
  );

  lines.push(
    `Channels removed: ${removeIds.size}`
  );

  lines.push(
    `Final registry channels: ${keptChannels.length}`
  );

  lines.push("");

  for (
    const state of [
      "LIVE_NOW",
      "UPCOMING",
      "VIDEO_EXISTS_NOT_LIVE",
      "ENDED_ONE_TIME",
      "DEAD",
      "DUPLICATE",
      "UNKNOWN",
    ]
  ) {
    lines.push(
      `${state}: ${counts[state] || 0}`
    );
  }

  lines.push("");
  lines.push(
    "=== REMOVED ==="
  );

  for (
    const item of results.filter(
      (item) =>
        removeStates.has(item.state)
    )
  ) {
    lines.push("");
    lines.push(
      `${item.channel.id}`
    );

    lines.push(
      `  ${item.channel.name}`
    );

    lines.push(
      `  Video: ${item.videoId}`
    );

    lines.push(
      `  State: ${item.state}`
    );

    lines.push(
      `  Reason: ${item.reason}`
    );
  }

  lines.push("");
  lines.push(
    "=== UNKNOWN / NOT REMOVED ==="
  );

  for (
    const item of results.filter(
      (item) =>
        item.state === "UNKNOWN"
    )
  ) {
    lines.push("");
    lines.push(
      `${item.channel.id}`
    );

    lines.push(
      `  ${item.channel.name}`
    );

    lines.push(
      `  Reason: ${item.reason}`
    );
  }

  lines.push("");
  lines.push(
    "=== VIDEO EXISTS BUT NOT LIVE ==="
  );

  for (
    const item of results.filter(
      (item) =>
        item.state ===
        "VIDEO_EXISTS_NOT_LIVE"
    )
  ) {
    lines.push("");
    lines.push(
      `${item.channel.id}`
    );

    lines.push(
      `  ${item.channel.name}`
    );

    lines.push(
      `  Reason: ${item.reason}`
    );
  }

  fs.writeFileSync(
    reportPath,
    `${lines.join("\n")}\n`,
    "utf8"
  );

  console.log("");
  console.log("=================================");
  console.log(" CLEANUP COMPLETE");
  console.log("=================================");
  console.log("");

  console.log(
    `Starting channels: ${channels.length}`
  );

  console.log(
    `YouTube checked: ${youtubeChannels.length}`
  );

  console.log(
    `Removed: ${removeIds.size}`
  );

  console.log(
    `Final channels: ${keptChannels.length}`
  );

  console.log("");

  console.log(
    `LIVE_NOW: ${counts.LIVE_NOW || 0}`
  );

  console.log(
    `UPCOMING: ${counts.UPCOMING || 0}`
  );

  console.log(
    `VIDEO_EXISTS_NOT_LIVE: ${
      counts.VIDEO_EXISTS_NOT_LIVE || 0
    }`
  );

  console.log(
    `ENDED_ONE_TIME: ${
      counts.ENDED_ONE_TIME || 0
    }`
  );

  console.log(
    `DEAD: ${counts.DEAD || 0}`
  );

  console.log(
    `DUPLICATE: ${
      counts.DUPLICATE || 0
    }`
  );

  console.log(
    `UNKNOWN: ${counts.UNKNOWN || 0}`
  );

  console.log("");
  console.log(
    `Report: ${reportPath}`
  );
}

main().catch((error) => {
  console.error(
    "YouTube cleanup crashed:",
    error
  );

  process.exitCode = 1;
});