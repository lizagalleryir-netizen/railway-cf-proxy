const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const app = express();

const PORT = process.env.PORT || 8080;
const API_KEY = process.env.API_KEY || "mysecretkey";

/* ---------- utils ---------- */
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- browser ---------- */
let browser;
let launching = false;

async function launchBrowser() {
  if (launching) return;
  launching = true;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process"
      ]
    });

    console.log("✅ Browser started");

    browser.on("disconnected", () => {
      console.log("⚠️ Browser disconnected, relaunching...");
      browser = null;
      launchBrowser();
    });

  } catch (e) {
    console.error("❌ Browser launch failed:", e);
  } finally {
    launching = false;
  }
}

launchBrowser();

/* ---------- routes ---------- */

app.get("/", (_, res) => {
  res.send("Cloudflare bypass proxy running");
});

app.get("/proxy", async (req, res) => {
  const { url, key } = req.query;

  if (key !== API_KEY) {
    return res.status(403).send("Invalid API key");
  }

  if (!url) {
    return res.status(400).send("Missing url");
  }

  if (!browser) {
    await launchBrowser();
    return res.status(503).send("Browser warming up, retry in 5s");
  }

  let page;

  try {
    page = await browser.newPage();

    await page.setViewport({ width: 1366, height: 768 });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
    );

    await page.setExtraHTTPHeaders({
      "accept-language": "en-US,en;q=0.9"
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });

    /* give cloudflare time */
    await sleep(10000);

    const html = await page.content();

    await page.close();

    res.set("Content-Type", "text/html");
    res.send(html);

  } catch (err) {
    console.error("❌ Proxy error:", err);

    if (page) {
      try { await page.close(); } catch {}
    }

    res.status(500).send("Proxy error");
  }
});

/* ---------- start ---------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
