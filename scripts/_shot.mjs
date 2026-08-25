import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = Number(process.argv[2]), H = Number(process.argv[3]), out = process.argv[4];
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await p.goto("http://localhost:5402/", { waitUntil: "networkidle2" });
await sleep(2500);
for (const f of [0.3, 0.6, 0.85, 0.95, 1]) {
  await p.evaluate((k) => window.__lenis.scrollTo(document.body.scrollHeight * k, { immediate: true }), f);
  await sleep(700);
}
await sleep(2000);
await p.screenshot({ path: out });
await b.close();
