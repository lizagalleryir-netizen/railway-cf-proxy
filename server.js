const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const app = express();

app.get("/", (req, res) => {
  res.send("✅ Cloudflare bypass proxy running on Railway");
});

app.get("/fetch", async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send("❌ Missing url parameter");

  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(target, { waitUntil: "domcontentloaded", timeout: 30000 });
    const html = await page.content();
    await browser.close();
    res.send(html);
  } catch (e) {
    console.error(e);
    res.status(500).send("⚠️ Error fetching page: " + e.message);
  }
});

// 👇 نکته مهم:
const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Proxy running on port ${PORT}`);
});
