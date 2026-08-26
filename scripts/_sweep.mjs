import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = process.argv[2];
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:5402/", { waitUntil: "networkidle2" });
await sleep(2500);
const secs = ["manifesto","social","web","design","branding","metodo","porque","clientes"];
for (const id of secs) {
  await p.evaluate((sid) => {
    const el = document.getElementById(sid); const sp = el.closest(".pin-spacer") || el;
    window.__lenis.scrollTo(window.scrollY + sp.getBoundingClientRect().top + sp.offsetHeight * 0.45, { immediate: true });
  }, id);
  await sleep(1400);
  await p.screenshot({ path: `${OUT}/s-${id}.png` });
}
await b.close();
console.log("ok");
