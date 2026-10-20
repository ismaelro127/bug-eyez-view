import puppeteer from "puppeteer";

const videoId = process.argv[2];

if (!videoId) {
  console.error("EMBED_BLOCKED MISSING_VIDEO_ID");
  process.exit(1);
}

const sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

(async () => {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
    });

    const page = await browser.newPage();

    let ready = false;
    let blocked = false;
    let errorCode = null;

    page.on("console", (msg) => {
      const text = msg.text();

      if (text.startsWith("EMBED_BLOCKED")) {
        blocked = true;

        const parts = text.split(/\s+/);
        errorCode = parts[1] || "UNKNOWN";

        return;
      }

      if (text === "EMBED_OK") {
        ready = true;
      }
    });

    const embedTestPath = new URL(
      "./embed-test.html",
      import.meta.url
    );

    embedTestPath.searchParams.set("v", videoId);

    await page.goto(embedTestPath.href, {
      waitUntil: "networkidle2",
      timeout: 15000,
    });

    // Give YouTube time to report errors that can arrive
    // after the player initially becomes ready.
    await sleep(5000);

    if (blocked) {
      console.log(
        `EMBED_BLOCKED ${errorCode || "UNKNOWN"}`
      );
      process.exitCode = 1;
      return;
    }

    if (ready) {
      console.log("EMBED_OK");
      return;
    }

    console.log("EMBED_BLOCKED NO_READY_SIGNAL");
    process.exitCode = 1;
  } catch (err) {
    console.error(
      "EMBED_BLOCKED TEST_FAILED",
      err?.message || err
    );

    process.exitCode = 1;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
})();