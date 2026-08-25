import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:5402/?laptop=debug", { waitUntil: "networkidle2" });
await sleep(2000);
await p.evaluate(() => window.__lenis.scrollTo(document.body.scrollHeight * 0.3, { immediate: true }));
await sleep(2500);
console.log("LAPTOP:", JSON.stringify(await p.evaluate(() => window.__laptop ? window.__laptop : null), null, 1).slice(0, 3000));
console.log("TELA:", JSON.stringify(await p.evaluate(() => window.__tela ? window.__tela() : null)));
console.log("TAMPA:", JSON.stringify(await p.evaluate(() => window.__tampa ? window.__tampa() : null)));
await b.close();
