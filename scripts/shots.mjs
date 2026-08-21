/**
 * Passeio visual: captura a página em vários pontos do scroll.
 *   node scripts/shots.mjs [url] [outDir] [width] [height]
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] || "http://localhost:5345/";
const OUT = process.argv[3] || "./.verify/tour";
const W = Number(process.argv[4] || 1440);
const H = Number(process.argv[5] || 900);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--mute-audio",
  ],
});

const page = await browser.newPage();
/* O Chrome headless reporta `prefers-reduced-motion: reduce` por padrão.
   Sem desligar isso explicitamente, TODA verificação mede o caminho reduzido
   e conclui que o site funciona — enquanto nada do movimento real é testado. */
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("response", (r) => r.status() >= 400 && errors.push(`${r.status()} ${r.url()}`));

await page.setViewport({ width: W, height: H });
await page.goto(URL, { waitUntil: "networkidle2" });
await page.evaluate(() => document.fonts.ready);
await sleep(4500);

const shot = async (name) => page.screenshot({ path: `${OUT}/${W}-${name}.png` });

await shot("00-hero");

// Uma parada por seção, ancorada no elemento — fração do documento erra
// assim que o número de seções muda.
const stops = [
  { p: 0.06, name: "01-hero-saindo" },
  { p: 0.14, name: "02-luz" },
  { id: "visao", name: "03-visao" },
  { id: "oficio", name: "04-oficio" },
  { id: "pilares", name: "05-pilares" },
  { id: "metodo", name: "06-metodo" },
  { id: "manifesto", name: "07-manifesto" },
  { id: "entrega", name: "08-entrega" },
  { id: "contato", name: "09-contato" },
  { p: 1, name: "10-rodape" },
];

for (const stop of stops) {
  await page.evaluate((s) => {
    if (s.id) {
      const el = document.getElementById(s.id);
      window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top);
    } else {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, max * s.p);
    }
  }, stop);
  await sleep(2800);
  await shot(stop.name);
}

console.log(errors.length ? errors.slice(0, 12).join("\n") : "sem erros de console/rede");
console.log(
  await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    altura: Math.round(document.documentElement.scrollHeight / window.innerHeight) + " telas",
    canvas: !!document.querySelector(".story__laptop canvas"),
    rays: document.querySelectorAll(".rays canvas").length,
  }))
);

await browser.close();
