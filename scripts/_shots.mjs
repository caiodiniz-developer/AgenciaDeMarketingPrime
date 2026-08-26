import puppeteer from "puppeteer-core";
import { sections } from "../src/content/story.js";

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
await p.waitForFunction(() => window.__lenis && window.__pos, { timeout: 30000 });
await sleep(2500);

/* O ENCAIXE, não o pico da travessia.
   O quadro que representa uma seção é aquele em que a pose declarada foi
   alcançada — é ali que o objeto fica parado enquanto o leitor lê. O pico de
   tamanho acontece no meio da viagem, com a seção anterior ainda na tela, e
   fotografar aquilo é fotografar uma transição. */
for (const id of process.argv.slice(5)) {
  const alvo = sections.find((s) => s.id === id)?.laptop;
  if (!alvo) continue;

  const faixa = await p.evaluate((sid) => {
    const el = document.getElementById(sid);
    const sp = el.closest(".pin-spacer") || el;
    const topo = window.scrollY + sp.getBoundingClientRect().top;
    return { topo: topo - window.innerHeight * 0.8, alt: sp.offsetHeight + window.innerHeight * 0.8 };
  }, id);

  let melhor = { erro: Infinity, y: faixa.topo, fracao: 0 };
  for (let k = 0; k <= 16; k++) {
    const y = Math.round(faixa.topo + (faixa.alt * k) / 16);
    await p.evaluate((v) => window.__lenis.scrollTo(v, { immediate: true }), y);
    await sleep(300);
    const r = await p.evaluate((a) => {
      const c = window.__cena();
      const s = window.__pos();
      if (!c || !s) return null;
      const px = s.telaPx;
      return {
        erro:
          Math.abs(c.x - a.x) + Math.abs(c.y - a.y) + Math.abs(c.scale - a.scale) * 0.6,
        fracao: ((px.dir - px.esq) * (px.base - px.topo)) / (window.innerWidth * window.innerHeight),
      };
    }, alvo);
    if (r && r.erro < melhor.erro) melhor = { erro: r.erro, y, fracao: r.fracao };
  }

  await p.evaluate((v) => window.__lenis.scrollTo(v, { immediate: true }), melhor.y);
  await sleep(1500);
  await p.screenshot({ path: `${OUT}/e-${id}.png` });
  console.log(
    `${id.padEnd(12)} ${Math.round(melhor.fracao * 100)}% da tela  (erro de pose ${melhor.erro.toFixed(2)})`
  );
}

await b.close();
