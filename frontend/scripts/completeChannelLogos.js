const fs = require("fs/promises");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

const registryPath =
  process.argv[2] ||
  path.join(
    projectRoot,
    "public",
    "legal_verified_channels.json"
  );

const logoDirectory = path.join(
  projectRoot,
  "public",
  "channel-logos"
);

const DOMAIN_OVERRIDES = {
  al_jazeera_english: "aljazeera.com",
  scripps_news: "scrippsnews.com",
  gb_news: "gbnews.com",
  livenow_fox: "livenowfox.com",
  law_crime_network: "lawandcrime.com",
  fox_weather: "foxweather.com",
  africanews_english: "africanews.com",
  arirang_tv: "arirang.com",
  arirang_tv_un: "arirang.com",
  cgtn: "cgtn.com",
  cgtn_documentary: "cgtn.com",
  cgtn_espanol: "cgtn.com",
  dw_en: "dw.com",
  dw_es: "dw.com",
  euronews_english: "euronews.com",
  france24_en: "france24.com",
  france24_es: "france24.com",
  nhk_world_japan: "nhk.or.jp",
  pbs_create: "pbs.org",
  pbs_kids: "pbskids.org",
  pbs_mpt_wmpt: "mpt.org",
  un_web_tv: "un.org",
  ndtv_24x7: "ndtv.com",
  cna_news: "channelnewsasia.com",
  newsmax: "newsmax.com",
  abc_news_au: "abc.net.au",
  trt_world: "trtworld.com",
  nasa_tv: "nasa.gov",
  kbs_world: "world.kbs.co.kr",
  rtp_africa: "rtp.pt",
  rtp_internacional: "rtp.pt",
  wipr: "wipr.pr",
  tv_unam: "tv.unam.mx",
  canal22: "canal22.org.mx",
  canal_once: "canalonce.mx",
  canal_catorce: "canalcatorce.tv",
  tv_migrante: "tvmigrante.tv",
  sicom_puebla: "sicompuebla.mx",
  smrtv_michoacan: "sistemamichoacano.tv",
  us_congress_live: "congress.gov",
};

function safeFileName(value) {
  return String(value || "channel")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_");
}

function isLocalLogo(logo) {
  return (
    typeof logo === "string" &&
    logo.startsWith("/")
  );
}

function getDomainFromUrl(value) {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    return null;
  }

  try {
    return new URL(value).hostname
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

function getClearbitDomain(logo) {
  if (
    typeof logo !== "string" ||
    !logo.includes("logo.clearbit.com/")
  ) {
    return null;
  }

  try {
    const parsed = new URL(logo);

    return decodeURIComponent(
      parsed.pathname.replace(/^\/+/, "")
    )
      .replace(/^www\./i, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

function getChannelDomain(channel) {
  if (DOMAIN_OVERRIDES[channel.id]) {
    return DOMAIN_OVERRIDES[channel.id];
  }

  const clearbitDomain =
    getClearbitDomain(channel.logo);

  if (clearbitDomain) {
    return clearbitDomain;
  }

  const websiteDomain = getDomainFromUrl(
    channel.officialLinks?.website
  );

  if (websiteDomain) {
    return websiteDomain;
  }

  const embedDomain = getDomainFromUrl(
    channel.embed?.url
  );

  if (
    embedDomain &&
    !embedDomain.includes("youtube.com")
  ) {
    return embedDomain;
  }

  return null;
}

function unique(values) {
  return [
    ...new Set(values.filter(Boolean)),
  ];
}

function getCandidates(channel) {
  const candidates = [];

  if (channel.youtubeId) {
    const videoId =
      encodeURIComponent(channel.youtubeId);

    candidates.push(
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      `https://i.ytimg.com/vi/${videoId}/default.jpg`
    );
  }

  const domain = getChannelDomain(channel);

  if (domain) {
    candidates.push(
      `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
        domain
      )}&sz=256`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
      `https://${domain}/apple-touch-icon.png`,
      `https://${domain}/apple-touch-icon-precomposed.png`,
      `https://${domain}/favicon.png`,
      `https://${domain}/favicon.ico`
    );
  }

  const currentLogo = channel.logo;

  if (
    typeof currentLogo === "string" &&
    /^https?:\/\//i.test(currentLogo) &&
    !currentLogo.includes(
      "logo.clearbit.com"
    ) &&
    !currentLogo.includes(
      "hqdefault_live.jpg"
    )
  ) {
    candidates.push(currentLogo);
  }

  return unique(candidates);
}

function extensionFromResponse(
  contentType,
  sourceUrl
) {
  const type = String(contentType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();

  if (type === "image/png") return "png";

  if (
    type === "image/jpeg" ||
    type === "image/jpg"
  ) {
    return "jpg";
  }

  if (type === "image/webp") return "webp";
  if (type === "image/gif") return "gif";
  if (type === "image/svg+xml") return "svg";
  if (type === "image/avif") return "avif";

  if (
    type === "image/x-icon" ||
    type === "image/vnd.microsoft.icon"
  ) {
    return "ico";
  }

  try {
    const extension = path
      .extname(new URL(sourceUrl).pathname)
      .replace(".", "")
      .toLowerCase();

    if (
      [
        "png",
        "jpg",
        "jpeg",
        "webp",
        "gif",
        "svg",
        "ico",
        "avif",
      ].includes(extension)
    ) {
      return extension === "jpeg"
        ? "jpg"
        : extension;
    }
  } catch {
    // Ignore URL parsing failures.
  }

  return "png";
}

async function fetchWithTimeout(
  url,
  timeoutMs = 12000
) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 BugEyezView Logo Recovery/1.0",
        Accept:
          "image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*,*/*",
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function downloadCandidate(
  channel,
  candidateUrl
) {
  const response =
    await fetchWithTimeout(candidateUrl);

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}`
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (
    contentType
      .toLowerCase()
      .includes("text/html")
  ) {
    throw new Error(
      "Received HTML instead of an image"
    );
  }

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  if (buffer.length < 100) {
    throw new Error(
      "Downloaded image was too small"
    );
  }

  const extension = extensionFromResponse(
    contentType,
    candidateUrl
  );

  const fileName = `${safeFileName(
    channel.id
  )}.${extension}`;

  await fs.writeFile(
    path.join(logoDirectory, fileName),
    buffer
  );

  channel.logo =
    `/channel-logos/${fileName}`;

  return {
    fileName,
    source: candidateUrl,
  };
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function getInitials(name) {
  const clean = String(name || "")
    .replace(
      /[^\p{L}\p{N}\s]/gu,
      " "
    )
    .replace(/\s+/g, " ")
    .trim();

  if (!clean) return "TV";

  const words = clean.split(" ");

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    words[0][0] +
    words[1][0]
  ).toUpperCase();
}

async function createFallbackBadge(channel) {
  const initials = xmlEscape(
    getInitials(channel.name)
  );

  const shortName = xmlEscape(
    String(channel.name || "Channel")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 26)
  );

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="256"
     height="256"
     viewBox="0 0 256 256">
  <defs>
    <linearGradient id="bg"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="1">
      <stop offset="0%" stop-color="#020617"/>
      <stop offset="100%" stop-color="#083344"/>
    </linearGradient>
  </defs>

  <rect width="256"
        height="256"
        rx="38"
        fill="url(#bg)"/>

  <rect x="8"
        y="8"
        width="240"
        height="240"
        rx="32"
        fill="none"
        stroke="#22d3ee"
        stroke-width="8"/>

  <circle cx="128"
          cy="105"
          r="64"
          fill="#0f172a"
          stroke="#34d399"
          stroke-width="5"/>

  <text x="128"
        y="126"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="58"
        font-weight="900"
        fill="#ffffff">${initials}</text>

  <text x="128"
        y="207"
        text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif"
        font-size="15"
        font-weight="700"
        fill="#a5f3fc">${shortName}</text>
</svg>`.trim();

  const fileName = `${safeFileName(
    channel.id
  )}.svg`;

  await fs.writeFile(
    path.join(logoDirectory, fileName),
    svg,
    "utf8"
  );

  channel.logo =
    `/channel-logos/${fileName}`;

  return fileName;
}

async function recoverChannelLogo(channel) {
  if (isLocalLogo(channel.logo)) {
    return {
      status: "already-local",
      id: channel.id,
    };
  }

  const candidates =
    getCandidates(channel);

  const errors = [];

  for (const candidate of candidates) {
    try {
      const result =
        await downloadCandidate(
          channel,
          candidate
        );

      return {
        status: "recovered",
        id: channel.id,
        ...result,
      };
    } catch (error) {
      errors.push(
        `${
          error instanceof Error
            ? error.message
            : String(error)
        } — ${candidate}`
      );
    }
  }

  const fileName =
    await createFallbackBadge(channel);

  return {
    status: "generated",
    id: channel.id,
    fileName,
    errors,
  };
}

async function runWithLimit(
  items,
  limit,
  worker
) {
  const results =
    new Array(items.length);

  let nextIndex = 0;

  async function runner() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      try {
        results[index] =
          await worker(items[index]);
      } catch (error) {
        results[index] = {
          status: "failed",
          id: items[index]?.id,
          error:
            error instanceof Error
              ? error.message
              : String(error),
        };
      }
    }
  }

  await Promise.all(
    Array.from(
      {
        length: Math.min(
          limit,
          items.length
        ),
      },
      () => runner()
    )
  );

  return results;
}

async function main() {
  const raw = await fs.readFile(
    registryPath,
    "utf8"
  );

  const channels = JSON.parse(raw);

  if (!Array.isArray(channels)) {
    throw new Error(
      "Channel registry must be a JSON array."
    );
  }

  await fs.mkdir(logoDirectory, {
    recursive: true,
  });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const backupPath =
    `${registryPath}.logo-recovery-${timestamp}`;

  await fs.copyFile(
    registryPath,
    backupPath
  );

  console.log(`Registry: ${registryPath}`);
  console.log(`Backup: ${backupPath}`);
  console.log(
    `Channels: ${channels.length}`
  );

  const results = await runWithLimit(
    channels,
    5,
    recoverChannelLogo
  );

  await fs.writeFile(
    registryPath,
    `${JSON.stringify(
      channels,
      null,
      2
    )}\n`,
    "utf8"
  );

  const recovered = results.filter(
    (result) =>
      result?.status === "recovered"
  );

  const generated = results.filter(
    (result) =>
      result?.status === "generated"
  );

  const alreadyLocal = results.filter(
    (result) =>
      result?.status === "already-local"
  );

  const failed = results.filter(
    (result) =>
      result?.status === "failed"
  );

  console.log("");
  console.log(
    `Already local: ${alreadyLocal.length}`
  );

  console.log(
    `Recovered real logos: ${recovered.length}`
  );

  console.log(
    `Generated fallback badges: ${generated.length}`
  );

  console.log(
    `Failed completely: ${failed.length}`
  );

  if (generated.length) {
    console.log(
      "\nFallback badges created for:"
    );

    for (const result of generated) {
      console.log(`- ${result.id}`);
    }
  }

  if (failed.length) {
    console.log(
      "\nComplete failures:"
    );

    for (const result of failed) {
      console.log(
        `- ${result.id}: ${result.error}`
      );
    }
  }

  console.log(
    "\nEvery processed channel now has a local logo path."
  );
}

main().catch((error) => {
  console.error(
    "Logo recovery failed:",
    error
  );

  process.exitCode = 1;
});