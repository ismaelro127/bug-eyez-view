import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

try {
  const page = await browser.newPage();

  await page.goto("https://www.thirteen.org/schedule/", {
    waitUntil: "networkidle2",
    timeout: 60000,
  });

  await new Promise((resolve) => setTimeout(resolve, 5000));

  const result = await page.evaluate(() => ({
    title: document.title,
    url: location.href,
    scheduleExists: !!document.querySelector("#scheduleajax"),
    scheduleText:
      document.querySelector("#scheduleajax")?.innerText?.slice(0, 1000) || "",
    wnetSchedule:
      typeof window.wnet_schedule !== "undefined"
        ? window.wnet_schedule
        : null,
  }));

  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}