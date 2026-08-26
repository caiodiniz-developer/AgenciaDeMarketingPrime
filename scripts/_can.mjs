import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:5402/?laptop=debug", { waitUntil: "networkidle2" });
await sleep(2200);
for (const f of [0.3, 0.6, 0.85, 0.95, 1]) {
  await p.evaluate((k) => window.__lenis.scrollTo(document.body.scrollHeight * k, { immediate: true }), f);
  await sleep(600);
}
await sleep(1500);
console.log(JSON.stringify(await p.evaluate(() => {
  const c = document.querySelector(".story__laptop canvas");
  const r = c.getBoundingClientRect();
  const h = c.parentElement.getBoundingClientRect();
  return { canvas: { t: Math.round(r.top), l: Math.round(r.left), w: Math.round(r.width), h: Math.round(r.height) },
           pai: { t: Math.round(h.top), l: Math.round(h.left), w: Math.round(h.width), h: Math.round(h.height),
                  cls: c.parentElement.className, pos: getComputedStyle(c.parentElement).position },
           px: window.__pos().telaPx };
})));
await b.close();
