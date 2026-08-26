import puppeteer from "puppeteer-core";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OUT = process.argv[2];
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new",
  args: ["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"] });
const p = await b.newPage();
p.on("pageerror", (e) => console.log("PAGEERROR:", String(e).slice(0,300)));
p.on("console", (m) => m.type() === "error" && console.log("CONSOLE:", m.text().slice(0,200)));
await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await p.setViewport({ width: 1440, height: 900 });
await p.goto("http://localhost:5402/", { waitUntil: "networkidle2" });
await sleep(2500);
await p.evaluate(() => {
  const el = document.getElementById("retrato");
  const sp = el.closest(".pin-spacer") || el;
  window.__lenis.scrollTo(window.scrollY + sp.getBoundingClientRect().top + sp.offsetHeight * 0.4, { immediate: true });
});
await sleep(1600);
await p.screenshot({ path: `${OUT}/ret-0.png` });

/* Responde: 1 forte, 2 fraca, 3 fraca, 4 forte  → 2 pilares caídos */
const escolhas = [0, 1, 1, 0];
for (let i = 0; i < 4; i++) {
  const ok = await p.evaluate((idx, esc) => {
    const li = document.querySelectorAll(".pergunta")[idx];
    if (!li) return false;
    const btn = li.querySelectorAll(".opcao")[esc];
    if (!btn) return false;
    btn.click();
    return true;
  }, i, escolhas[i]);
  if (!ok) { console.log("falhou na pergunta", i); break; }
  await sleep(500);
}
await sleep(1400);
await p.screenshot({ path: `${OUT}/ret-1.png` });
console.log(JSON.stringify(await p.evaluate(() => {
  const l = document.querySelector(".retrato__leitura");
  return {
    estado: document.querySelector("[data-retrato]")?.dataset.estado,
    titulo: l?.querySelector(".leitura__titulo")?.textContent,
    forca: l?.querySelector(".leitura__forca")?.textContent,
    frente: l?.querySelector(".leitura__frente-nome")?.textContent,
  };
})));
await b.close();
