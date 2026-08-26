import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = process.argv[2];
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
for (const r of process.argv.slice(3)) {
  const p = await b.newPage();
  await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await p.setViewport({ width: 1440, height: 900 });
  await p.goto("http://localhost:5402/?laptop=debug&rot=" + r, { waitUntil: "networkidle2" });
  await sleep(2000);
  for (const f of [0.3, 0.6, 0.85, 0.95, 1]) {
    await p.evaluate((k) => window.__lenis.scrollTo(document.body.scrollHeight * k, { immediate: true }), f);
    await sleep(500);
  }
  await sleep(1200);
  console.log(r, JSON.stringify(await p.evaluate(() => window.__laptop.map(m => ({ mat: m.material, cor: m.cor, tam: m.tamanho, c: m.centro })))));
  await p.screenshot({ path: `${OUT}/dbg-${r.replace(/,/g,"_")}.png`, clip: { x: 450, y: 200, width: 560, height: 480 } });
  await p.close();
}
await b.close();
