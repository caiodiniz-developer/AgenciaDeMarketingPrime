import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900);
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: W, height: H });
await p.goto("http://localhost:5402/?laptop=debug", { waitUntil: "networkidle2" });
await sleep(2500);
for (const f of [0.3, 0.6, 0.85, 0.95, 1]) {
  await p.evaluate((k) => window.__lenis.scrollTo(document.body.scrollHeight * k, { immediate: true }), f);
  await sleep(700);
}
await sleep(1500);
console.log(W + "x" + H, JSON.stringify(await p.evaluate(() => {
  const btn = document.querySelector('[data-sec="contato"] .btn');
  const rb = btn ? btn.getBoundingClientRect() : null;
  const pos = window.__pos(); const c = window.__cena();
  const meia = pos.viewport[1] / 2;
  const telaY = window.innerHeight / 2 - (pos.centroMundo[1] / meia) * (window.innerHeight / 2);
  return {
    botaoBase: rb && Math.round(rb.bottom), botaoCx: rb && Math.round(rb.left + rb.width / 2),
    laptopCentroY: Math.round(telaY), abaixoDoBotao: rb ? telaY > rb.bottom : null,
    rotYgraus: +(pos.rot[1] * 180 / Math.PI).toFixed(1),
    pouso: +c.pouso.toFixed(3), escala: pos.escala, canal: c.canal, presenca: +c.presenca.toFixed(2),
  };
})));
await b.close();
