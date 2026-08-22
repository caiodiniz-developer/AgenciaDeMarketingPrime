/**
 * Passeio visual: captura a página em vários pontos do scroll.
 *   node scripts/shots.mjs [url] [outDir] [width] [height]
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] || "http://localhost:5402/";
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
  { id: 'sistema', avanco: 1.7, name: '01-sistema-meio' },
  { id: 'sistema', avanco: 3.2, name: '02-sistema-fim' },
];

/* Com seções presas, um salto único erra o destino: o espaçador do pin
   muda o layout durante a própria rolagem. Aproxima e corrige. */
async function irPara(id) {
  for (let i = 0; i < 4; i++) {
    const d = await page.evaluate((s) => document.getElementById(s).getBoundingClientRect().top, id);
    if (Math.abs(d) < 4) break;
    await page.evaluate((v) => window.scrollTo(0, window.scrollY + v), d);
    await sleep(1400);
  }
}

/* Dentro de uma seção PRESA, `getBoundingClientRect().top` fica em 0 do
   começo ao fim do pin — então `irPara` não consegue distinguir onde
   estamos. A base de cada pin é gravada na primeira chegada e os avanços
   passam a ser absolutos a partir dela. */
const bases = new Map();

for (const stop of stops) {
  if (stop.id) {
    if (!bases.has(stop.id)) {
      await irPara(stop.id);
      bases.set(stop.id, await page.evaluate(() => window.scrollY));
    }
    const base = bases.get(stop.id);
    await page.evaluate(
      ([b, n]) => window.scrollTo(0, b + window.innerHeight * (n || 0)),
      [base, stop.avanco || 0]
    );
  } else {
    await page.evaluate((prog) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, max * prog);
    }, stop.p);
  }
  await sleep(2600);
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
