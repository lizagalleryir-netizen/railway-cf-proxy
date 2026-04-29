const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "mysecretkey";

/* ---------------- Browser Pool ---------------- */

let browser;
const MAX_PAGES = 5;
let activePages = 0;

async function startBrowser() {
  browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
      "--disable-gpu"
    ]
  });

  console.log("✅ Browser started");
}

startBrowser();

/* ---------------- Helper ---------------- */

async function solveCloudflare(page) {
  try {

    await page.waitForFunction(() => {
      const title = document.title.toLowerCase();
      return !title.includes("just a moment");
    }, { timeout: 20000 });

  } catch (e) {
    console.log("Cloudflare challenge maybe still active");
  }
}

/* ---------------- Health ---------------- */

app.get("/", (req, res) => {
  res.send("Cloudflare bypass proxy running");
});

/* ---------------- Proxy ---------------- */

app.get("/proxy", async (req, res) => {

  const { url, key, screenshot } = req.query;

  if (key !== API_KEY) {
    return res.status(403).send("Invalid API key");
  }

  if (!url) {
    return res.status(400).send("Missing url");
  }

  if (activePages >= MAX_PAGES) {
    return res.status(429).send("Server busy");
  }

  let page;

  try {

    activePages++;

    page = await browser.newPage();

    await page.setViewport({
      width: 1366,
      height: 768
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9"
    });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 60000
    });

    /* try solving cloudflare */

    await solveCloudflare(page);

    await page.waitForTimeout(5000);

    if (screenshot === "true") {

      const img = await page.screenshot({
        type: "png",
        fullPage: true
      });

      await page.close();
      activePages--;

      res.set("Content-Type", "image/png");
      return res.send(img);
    }

    const html = await page.content();

    await page.close();
    activePages--;

    res.set("Content-Type", "text/html");
    res.send(html);

  } catch (err) {

    console.error(err);

    if (page) await page.close();
    activePages--;

    res.status(500).send("Proxy error");
  }
});

/* ---------------- Start Server ---------------- */

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
