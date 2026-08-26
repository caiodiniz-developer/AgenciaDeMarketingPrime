import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = process.argv[2];
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);

const b = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: W, height: H });
await p.goto("http://localhost:5402/?laptop=medir", { waitUntil: "networkidle2" });
await p.waitForFunction(() => window.__lenis && window.__pos && window.__pos());
await sleep(2500);

/* Encontra, dentro da faixa de cada seção, o quadro em que o objeto está
   maior — o momento de destaque — e fotografa exatamente ele. */
const ALVOS = process.argv.slice(5);
for (const id of ALVOS) {
  const faixa = await p.evaluate((sid) => {
    const el = document.getElementById(sid);
    const sp = el.closest(".pin-spacer") || el;
    const topo = window.scrollY + sp.getBoundingClientRect().top;
    return { topo: topo - window.innerHeight * 0.7, alt: sp.offsetHeight + window.innerHeight * 0.7 };
  }, id);

  let melhor = { fracao: -1, y: faixa.topo };
  for (let k = 0; k <= 12; k++) {
    const y = Math.round(faixa.topo + (faixa.alt * k) / 12);
    await p.evaluate((v) => window.__lenis.scrollTo(v, { immediate: true }), y);
    await sleep(320);
    const f = await p.evaluate(() => {
      const s = window.__pos();
      const c = window.__cena();
      if (!s || !c || c.presenca < 0.3) return -1;
      const px = s.telaPx;
      return ((px.dir - px.esq) * (px.base - px.topo)) / (window.innerWidth * window.innerHeight);
    });
    if (f > melhor.fracao) melhor = { fracao: f, y };
  }

  await p.evaluate((v) => window.__lenis.scrollTo(v, { immediate: true }), melhor.y);
  await sleep(1400);
  await p.screenshot({ path: `${OUT}/d-${id}.png` });
  console.log(id, "→", Math.round(melhor.fracao * 100) + "% da tela");
}

await b.close();
