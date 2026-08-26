import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:5402/?laptop=medir", { waitUntil: "networkidle2" });
await sleep(3000);
const ler = async (rot) => p.evaluate(() => ({ pos: window.__pos(), cena: window.__cena(), y: Math.round(window.scrollY), max: Math.round(document.documentElement.scrollHeight - window.innerHeight) }));
for (const id of ["branding","porque","estrategia","contato"]) {
  await p.evaluate((sid) => { const el = document.getElementById(sid); const sp = el.closest(".pin-spacer")||el;
    window.__lenis.scrollTo(window.scrollY + sp.getBoundingClientRect().top + sp.offsetHeight*0.5, { immediate: true }); }, id);
  await sleep(1200);
}
await p.evaluate(() => window.__lenis.scrollTo(document.documentElement.scrollHeight, { immediate: true }));
await sleep(2400);
console.log("salto unico:", JSON.stringify(await ler()));
await sleep(3000);
console.log("mais 3s   :", JSON.stringify(await ler()));
await b.close();
