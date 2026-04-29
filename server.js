const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const app = express();

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "mysecretkey";

let browser;

/* ---------- launch browser once ---------- */
async function initBrowser() {
  browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  console.log("✅ Browser started");
}

initBrowser();

/* ---------- health check ---------- */
app.get("/", (req, res) => {
  res.send("Cloudflare bypass proxy running");
});

/* ---------- proxy endpoint ---------- */
app.get("/proxy", async (req, res) => {
  try {

    const { url, key, screenshot, render } = req.query;

    if (key !== API_KEY) {
      return res.status(403).send("Invalid API key");
    }

    if (!url) {
      return res.status(400).send("Missing url");
    }

    /* ---------- fast fetch (no JS render) ---------- */
    if (render === "false") {
      const fetch = (...args) =>
        import("node-fetch").then(({ default: fetch }) => fetch(...args));

      const response = await fetch(url, { timeout: 20000 });
      const text = await response.text();

      res.set("Content-Type", "text/html");
      return res.send(text);
    }

    /* ---------- puppeteer render ---------- */
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
    );

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });

    /* ---------- screenshot mode ---------- */
    if (screenshot === "true") {
      const img = await page.screenshot({ type: "png" });
      await page.close();

      res.set("Content-Type", "image/png");
      return res.send(img);
    }

    const html = await page.content();
    await page.close();

    res.set("Content-Type", "text/html");
    res.send(html);

  } catch (err) {
    console.error(err);
    res.status(500).send("Proxy error");
  }
});

/* ---------- start server ---------- */
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on port " + PORT);
});
