const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const app = express();

app.get("/", (req, res) => {
  res.send("Cloudflare bypass proxy running");
});

app.get("/proxy", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send("Missing url parameter");
  }

  try {
    const browser = await puppeteer.launch({
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2" });

    const content = await page.content();

    await browser.close();

    res.send(content);
  } catch (err) {
    res.status(500).send(err.toString());
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log("Proxy running on port " + PORT);
});
