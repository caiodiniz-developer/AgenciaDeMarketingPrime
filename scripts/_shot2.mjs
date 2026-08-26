import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = Number(process.argv[2]), H = Number(process.argv[3]), out = process.argv[4];
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: W, height: H });
await p.goto("http://localhost:5402/?laptop=debug", { waitUntil: "networkidle2" });
await sleep(2200);
for (const f of [0.3, 0.6, 0.85, 0.95, 1]) {
  await p.evaluate((k) => window.__lenis.scrollTo(document.body.scrollHeight * k, { immediate: true }), f);
  await sleep(650);
}
await sleep(1800);
const m = await p.evaluate(() => ({ px: window.__pos().telaPx, cena: window.__cena() }));
console.log(JSON.stringify(m));
/* Desenha a caixa medida por cima, para conferir com o olho. */
await p.evaluate((px) => {
  const d = document.createElement("div");
  d.style.cssText = `position:fixed;left:${px.esq}px;top:${px.topo}px;width:${px.dir-px.esq}px;height:${px.base-px.topo}px;border:2px solid #0f0;z-index:99999;pointer-events:none`;
  document.body.appendChild(d);
}, m.px);
await p.screenshot({ path: out });
await b.close();
