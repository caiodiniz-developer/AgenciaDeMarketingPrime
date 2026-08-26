import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = Number(process.argv[2]), H = Number(process.argv[3]);
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: W, height: H });
await p.goto("http://localhost:5402/", { waitUntil: "networkidle2" });
await sleep(2200);
const ler = () => p.evaluate(() => {
  const sec = document.querySelector('[data-sec="contato"]');
  const t = sec.querySelector(".sec__title") || sec.querySelector("h2");
  const nav = document.querySelector(".nav");
  const inner = sec.querySelector(".sec__inner");
  const r = (e) => e ? { t: Math.round(e.getBoundingClientRect().top), b: Math.round(e.getBoundingClientRect().bottom) } : null;
  const cs = getComputedStyle(sec); return { sec: r(sec), h: Math.round(sec.getBoundingClientRect().height), titulo: r(t), inner: r(inner), innerH: Math.round(inner.getBoundingClientRect().height), navBase: Math.round(nav.getBoundingClientRect().bottom), pt: cs.paddingTop, pb: cs.paddingBottom, disp: cs.display, align: cs.alignItems, just: cs.justifyContent };
});
/* meio do pin */
await p.evaluate(() => { const el = document.querySelector('[data-sec="contato"]'); const sp = el.closest(".pin-spacer")||el;
  window.__lenis.scrollTo(window.scrollY + sp.getBoundingClientRect().top + sp.offsetHeight*0.5, { immediate: true }); });
await sleep(1400);
console.log("meio :", JSON.stringify(await ler()));
for (const f of [0.9, 0.97, 1]) {
  await p.evaluate((k) => window.__lenis.scrollTo(document.documentElement.scrollHeight * k, { immediate: true }), f);
  await sleep(900);
}
await sleep(900);
console.log("fim  :", JSON.stringify(await ler()));
await b.close();
