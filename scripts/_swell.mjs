import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = process.argv[2];
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:5402/?laptop=medir", { waitUntil: "networkidle2" });
await p.waitForFunction(() => window.__lenis && window.__pos, { timeout: 30000 });
await sleep(2500);
const faixa = await p.evaluate(() => {
  const el = document.getElementById("contato");
  const sp = el.closest(".pin-spacer") || el;
  const topo = window.scrollY + sp.getBoundingClientRect().top;
  return { de: topo - window.innerHeight * 2.2, ate: topo + window.innerHeight * 0.4 };
});
let melhor = { f: -1, y: faixa.de };
for (let k = 0; k <= 24; k++) {
  const y = Math.round(faixa.de + ((faixa.ate - faixa.de) * k) / 24);
  await p.evaluate((v) => window.__lenis.scrollTo(v, { immediate: true }), y);
  await sleep(300);
  const f = await p.evaluate(() => {
    const s = window.__pos(); const c = window.__cena();
    if (!s || !c || c.presenca < 0.3) return -1;
    const px = s.telaPx;
    const vw = innerWidth, vh = innerHeight;
    const dw = Math.max(0, Math.min(px.dir, vw) - Math.max(px.esq, 0));
    const dh = Math.max(0, Math.min(px.base, vh) - Math.max(px.topo, 0));
    return (dw * dh) / (vw * vh);   // área VISÍVEL, não a caixa toda
  });
  if (f > melhor.f) melhor = { f, y };
}
await p.evaluate((v) => window.__lenis.scrollTo(v, { immediate: true }), melhor.y);
await sleep(1500);
await p.screenshot({ path: `${OUT}/swell.png` });
console.log("pico visível:", Math.round(melhor.f * 100) + "% da tela");
await b.close();
