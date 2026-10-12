import puppeteer from "puppeteer";

const videoId = process.argv[2];

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  page.on("console", (msg) => {
    logger.info(msg.text());
  });

  await page.goto(
    `file://${process.cwd()}/embed-test.html?v=${videoId}`,
    { waitUntil: "networkidle2", timeout: 15000 }
  );

  await page.waitForTimeout(4000);
  await browser.close();
})();
