/** Sondagem do modelo 3D: uma foto por orientação candidata. */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5402/";
const OUT = "./.laptop";
mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--no-sandbox", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});

const rots = process.argv[2]
  ? [process.argv[2]]
  : ["-90,180,0", "-90,0,0", "90,0,0", "90,180,0", "0,0,0", "-90,90,0"];
const debug = process.argv[3] === "debug";

for (const rot of rots) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([
    { name: "prefers-reduced-motion", value: "no-preference" },
  ]);
  await page.setViewport({ width: 1200, height: 900 });
  await page.goto(`${BASE}?rot=${rot}${debug ? "&laptop=debug" : ""}`, {
    waitUntil: "networkidle2",
  });
  await sleep(2200);

  // Leva a seção Web ao topo: é onde o objeto fica grande, no centro e frontal.
  for (let i = 0; i < 4; i++) {
    const d = await page.evaluate(
      () => document.getElementById("web").getBoundingClientRect().top
    );
    if (Math.abs(d) < 6) break;
    await page.evaluate((v) => window.scrollTo(0, window.scrollY + v), d);
    await sleep(1200);
  }
  await sleep(1500);

  const nome = rot.replace(/,/g, "_");
  await page.screenshot({ path: `${OUT}/rot-${nome}.png` });

  if (debug) {
    const info = await page.evaluate(() => window.__laptop || null);
    console.log(`\n=== rot ${rot} ===`);
    (info || []).forEach((m) =>
      console.log(
        `${String(m.i).padStart(2)} ${m.cor} mat=${m.material} tam=${m.tamanho.join("x")} centro=${m.centro.join(",")}`
      )
    );
  } else {
    console.log(`rot ${rot} → ${OUT}/rot-${nome}.png`);
  }
  await page.close();
}

await browser.close();
