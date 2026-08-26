import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = process.argv[2];
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: Number(process.argv[3]||1440), height: Number(process.argv[4]||900) });
await p.goto("http://localhost:5402/", { waitUntil: "networkidle2" });
await sleep(2500);
for (const id of process.argv.slice(5)) {
  await p.evaluate((sid) => {
    const el = document.getElementById(sid); const sp = el.closest(".pin-spacer") || el;
    window.__lenis.scrollTo(window.scrollY + sp.getBoundingClientRect().top + sp.offsetHeight * 0.45, { immediate: true });
  }, id);
  await sleep(1600);
  await p.screenshot({ path: `${OUT}/s2-${id}.png` });
}
await b.close();
console.log("ok");
