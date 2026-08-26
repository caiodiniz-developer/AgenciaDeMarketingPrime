import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: 390, height: 844 });
await p.goto("http://localhost:5402/", { waitUntil: "networkidle2" });
await sleep(2500);
for (const f of [0.3, 0.6, 0.9, 1]) {
  await p.evaluate((k) => window.__lenis.scrollTo((document.documentElement.scrollHeight - innerHeight) * k, { immediate: true }), f);
  await sleep(900);
}
await sleep(3000);
console.log(JSON.stringify(await p.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null;
    const b = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return { l: Math.round(b.left), t: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height), op: cs.opacity, disp: cs.display, vis: cs.visibility }; };
  return { logo: r(".nav__logo, .nav__marca, .nav a[href='#topo']"), cta: r(".nav__cta"), bar: r(".nav__bar"), menuBtn: r(".nav__menu, .nav button") };
}), null, 1));
await b.close();
