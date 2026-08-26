import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = Number(process.argv[2]), H = Number(process.argv[3]), OUT = process.argv[4];
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: W, height: H });
await p.goto("http://localhost:5402/?laptop=medir", { waitUntil: "networkidle2" });
await p.waitForFunction(() => window.__lenis && window.__pos, { timeout: 30000 });
await sleep(2200);
for (const f of [0.3, 0.6, 0.85, 0.95, 1]) {
  await p.evaluate((k) => window.__lenis.scrollTo((document.documentElement.scrollHeight - window.innerHeight) * k, { immediate: true }), f);
  await sleep(650);
}
await sleep(1800);
console.log(W + "x" + H, JSON.stringify(await p.evaluate(() => {
  const btn = document.querySelector('[data-sec="contato"] .btn');
  const rod = document.querySelector(".footer");
  const rb = btn.getBoundingClientRect(), rf = rod.getBoundingClientRect();
  const s = window.__pos(); const c = window.__cena();
  return { botaoBase: Math.round(rb.bottom), rodapeTopo: Math.round(rf.top),
    laptop: s.telaPx, pouso: +c.pouso.toFixed(2), rotY: +(c.rotY*180/Math.PI).toFixed(1),
    folgaAcima: s.telaPx.topo - Math.round(rb.bottom), folgaAbaixo: Math.round(rf.top) - s.telaPx.base };
})));
if (OUT) { await p.screenshot({ path: OUT }); }
await b.close();
