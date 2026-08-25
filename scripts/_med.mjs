import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = Number(process.argv[2] || 1440), H = Number(process.argv[3] || 900);

const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: W, height: H });
p.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0, 240)));
await p.goto("http://localhost:5402/?laptop=debug", { waitUntil: "networkidle2" });
await sleep(2500);

const alturaDoc = await p.evaluate(() => document.body.scrollHeight);
const amostras = [];
for (let f = 0.06; f <= 1.001; f += 0.04) {
  await p.evaluate((y) => window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y), Math.round(alturaDoc * f));
  await sleep(420);
  const a = await p.evaluate(() => ({
    f: +(window.scrollY / document.body.scrollHeight).toFixed(2),
    cena: window.__cena ? window.__cena() : null,
    pos: window.__pos ? window.__pos() : null,
  }));
  amostras.push(a);
}

const zs = amostras.map(a => a.pos?.z).filter(v => v != null);
const rz = amostras.map(a => a.pos?.rot?.[2]).filter(v => v != null);
const ry = amostras.map(a => a.pos?.rot?.[1]).filter(v => v != null);
const g = (v) => (v * 180 / Math.PI).toFixed(1);
console.log("PROFUNDIDADE z mundo:", Math.min(...zs).toFixed(2), "→", Math.max(...zs).toFixed(2), "| amplitude", (Math.max(...zs)-Math.min(...zs)).toFixed(2));
console.log("ROT Z:", g(Math.min(...rz)) + "°", "→", g(Math.max(...rz)) + "°");
console.log("ROT Y:", g(Math.min(...ry)) + "°", "→", g(Math.max(...ry)) + "°", "| percurso", g(Math.max(...ry)-Math.min(...ry)) + "°");

/* O FECHO: o notebook está abaixo do botão? */
await p.evaluate(() => window.__lenis.scrollTo(document.querySelector('[data-sec="contato"]'), { immediate: true }));
await sleep(600);
for (const passo of [0.3, 0.6, 0.9, 1.0]) {
  await p.evaluate((k) => {
    const el = document.querySelector('[data-sec="contato"]');
    const sp = el.closest(".pin-spacer") || el;
    const topo = window.scrollY + sp.getBoundingClientRect().top;
    window.__lenis.scrollTo(topo + sp.offsetHeight * k, { immediate: true });
  }, passo);
  await sleep(900);
  const r = await p.evaluate(() => {
    const btn = document.querySelector('[data-sec="contato"] a[href*="wa.me"], [data-sec="contato"] .botao, [data-sec="contato"] a[class*="cta"], [data-sec="contato"] button');
    const rb = btn ? btn.getBoundingClientRect() : null;
    return {
      botao: btn ? { classe: btn.className.slice(0,30), base: Math.round(rb.bottom), cx: Math.round(rb.left + rb.width/2) } : null,
      pos: window.__pos ? window.__pos() : null,
      cena: window.__cena ? window.__cena() : null,
    };
  });
  console.log(passo, JSON.stringify(r));
}
await b.close();
