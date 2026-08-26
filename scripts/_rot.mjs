import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = process.argv[2];
const ROTS = process.argv.slice(3);
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
for (const r of ROTS) {
  const p = await b.newPage();
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto("http://localhost:5402/?rot=" + r, { waitUntil: "networkidle2" });
  await sleep(2000);
  for (const f of [0.3, 0.6, 0.85, 0.95, 1]) {
    await p.evaluate((k) => window.__lenis.scrollTo(document.body.scrollHeight * k, { immediate: true }), f);
    await sleep(500);
  }
  await sleep(1500);
  await p.screenshot({ path: `${OUT}/rot-${r.replace(/,/g,"_")}.png`});
  await p.close();
  console.log("rot", r);
}
await b.close();
