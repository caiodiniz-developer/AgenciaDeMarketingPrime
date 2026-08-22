/**
 * Fotografa a página seção por seção.
 *   node scripts/shots.mjs [url] [outDir] [largura] [altura]
 *
 * Serve para OLHAR, não para medir: quem mede é verify.mjs. A diferença
 * importa porque muita coisa aqui — orientação do modelo 3D, hierarquia de
 * uma composição, se um texto caiu por cima de uma imagem — não tem asserção
 * possível. Só se resolve vendo.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] || "http://localhost:5402/";
const OUT = process.argv[3] || "./.shots";
const W = Number(process.argv[4] || 1440);
const H = Number(process.argv[5] || 900);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--mute-audio"],
});

const page = await browser.newPage();
/* O Chrome headless reporta `prefers-reduced-motion: reduce` por padrão. Sem
   desligar isso, todo retrato sai do caminho reduzido — e o que se quer ver
   é justamente o movimento. */
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

const erros = [];
page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));

await page.goto(URL, { waitUntil: "networkidle2" });
await sleep(2500);

/**
 * Rola até uma fração do documento e espera assentar.
 * Fração e não elemento: com seções presas, o alvo se desloca enquanto se
 * rola, e o que interessa aqui é varrer a página inteira em passos regulares.
 */
async function ate(frac) {
  await page.evaluate((f) => {
    const alt = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, alt * f);
  }, frac);
  await sleep(1400);
}

const passos = Number(process.env.PASSOS || 26);
for (let i = 0; i <= passos; i++) {
  const f = i / passos;
  await ate(f);
  const nome = `${String(i).padStart(2, "0")}-${Math.round(f * 100)}pc`;
  await page.screenshot({ path: `${OUT}/${nome}.png` });
  const onde = await page.evaluate(() => {
    const secs = [...document.querySelectorAll("[data-sec]")];
    const vis = secs.find((s) => {
      const r = s.getBoundingClientRect();
      return r.top < window.innerHeight * 0.5 && r.bottom > window.innerHeight * 0.5;
    });
    return vis?.dataset.sec || "—";
  });
  console.log(`${nome}  ${onde}`);
}

if (erros.length) {
  console.log("\nERROS DE CONSOLE:");
  erros.slice(0, 12).forEach((e) => console.log("  " + e));
}

await browser.close();
