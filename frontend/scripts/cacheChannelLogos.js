const fs = require("fs/promises");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

const registryPath =
  process.argv[2] ||
  path.join(projectRoot, "public", "legal_verified_channels.json");

const logoDirectory = path.join(
  projectRoot,
  "public",
  "channel-logos"
);

function safeFileName(value) {
  return String(value)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .replace(/_+/g, "_");
}

function extensionFromContentType(contentType, url) {
  const normalized = String(contentType || "")
    .toLowerCase()
    .split(";")[0]
    .trim();

  if (normalized === "image/png") return "png";
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/svg+xml") return "svg";

  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname).replace(".", "");

    if (
      ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(
        extension.toLowerCase()
      )
    ) {
      return extension.toLowerCase() === "jpeg"
        ? "jpg"
        : extension.toLowerCase();
    }
  } catch {
    // Ignore invalid URL parsing.
  }

  return "jpg";
}

async function downloadLogo(channel) {
  const logoUrl = channel.logo;

  if (
    typeof logoUrl !== "string" ||
    !/^https?:\/\//i.test(logoUrl)
  ) {
    return {
      status: "skipped",
      id: channel.id,
    };
  }

  const response = await fetch(logoUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 BugEyezView Logo Cache/1.0",
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(
      `${response.status} ${response.statusText}`
    );
  }

  const contentType =
    response.headers.get("content-type") || "";

  if (!contentType.toLowerCase().startsWith("image/")) {
    throw new Error(
      `Expected image but received ${contentType || "unknown content type"}`
    );
  }

  const buffer = Buffer.from(
    await response.arrayBuffer()
  );

  if (buffer.length === 0) {
    throw new Error("Downloaded image was empty");
  }

  const extension = extensionFromContentType(
    contentType,
    logoUrl
  );

  const fileName = `${safeFileName(
    channel.id
  )}.${extension}`;

  const outputPath = path.join(
    logoDirectory,
    fileName
  );

  await fs.writeFile(outputPath, buffer);

  channel.logo = `/channel-logos/${fileName}`;

  return {
    status: "downloaded",
    id: channel.id,
    fileName,
  };
}

async function runWithLimit(items, limit, worker) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function runner() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) return;

      try {
        results[index] = await worker(items[index]);
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
      { length: Math.min(limit, items.length) },
      () => runner()
    )
  );

  return results;
}

async function main() {
  console.log(`Registry: ${registryPath}`);

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

  const backupPath = `${registryPath}.backup-${timestamp}`;

  await fs.copyFile(registryPath, backupPath);

  console.log(`Backup: ${backupPath}`);
  console.log(`Channels: ${channels.length}`);

  const results = await runWithLimit(
    channels,
    6,
    downloadLogo
  );

  await fs.writeFile(
    registryPath,
    `${JSON.stringify(channels, null, 2)}\n`,
    "utf8"
  );

  const downloaded = results.filter(
    (result) => result.status === "downloaded"
  );

  const skipped = results.filter(
    (result) => result.status === "skipped"
  );

  const failed = results.filter(
    (result) => result.status === "failed"
  );

  console.log("");
  console.log(`Downloaded: ${downloaded.length}`);
  console.log(`Already local/missing: ${skipped.length}`);
  console.log(`Failed: ${failed.length}`);

  if (failed.length > 0) {
    console.log("\nFailed logos:");

    for (const failure of failed) {
      console.log(
        `- ${failure.id}: ${failure.error}`
      );
    }
  }

  console.log(
    "\nLogo paths were updated to /channel-logos/..."
  );
}

main().catch((error) => {
  console.error("Logo caching failed:", error);
  process.exitCode = 1;
});