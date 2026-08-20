/**
 * Verificação da sequência: mede em vez de confiar na leitura do código.
 *   node scripts/verify.mjs [url] [outDir]
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] || "http://localhost:5311/";
const OUT = process.argv[3] || "./.verify";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--autoplay-policy=no-user-gesture-required", "--no-sandbox", "--mute-audio"],
});

const errors = [];
const bad = [];

const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("response", (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));

/* ── 1. viewports ───────────────────────────────────────────────────────── */
for (const [w, h, name] of [
  [375, 812, "mobile"],
  [768, 1024, "tablet"],
  [1440, 900, "desktop"],
]) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "networkidle2" });
  await page.evaluate(() => document.fonts.ready);
  await sleep(3200); // deixa a abertura terminar

  const geo = await page.evaluate(() => {
    const doc = document.documentElement;
    const title = document.querySelector(".hero__title");
    const h2 = document.querySelector(".chapter__title");
    const cs = (el) => {
      const s = getComputedStyle(el);
      return {
        font: parseFloat(s.fontSize),
        line: parseFloat(s.lineHeight) || parseFloat(s.fontSize),
      };
    };
    const t = cs(title);
    const c = cs(h2);
    const chars = [...document.querySelectorAll(".hero__char")];
    return {
      overflowX: doc.scrollWidth - window.innerWidth,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      h1Ratio: +(t.line / t.font).toFixed(3),
      h2Ratio: +(c.line / c.font).toFixed(3),
      h1Font: Math.round(t.font),
      charsPainted: chars.filter((el) => el.style.backgroundImage.includes("gradient")).length,
      charOpacity: +getComputedStyle(chars[0]).opacity,
      cueOpacity: +getComputedStyle(document.querySelector(".hero__cue")).opacity,
      chapterOpacity: +getComputedStyle(document.querySelector(".chapter")).opacity,
      tier: document.querySelector(".stage").dataset.tier,
      trackH: document.querySelector(".track").getBoundingClientRect().height,
      vh: window.innerHeight,
    };
  });

  log(`\n── ${name} ${w}x${h} ──`);
  log(`  overflow-x extra ....... ${geo.overflowX}px  ${geo.overflowX === 0 ? "OK" : "FALHOU"}`);
  log(`  body overflow-y ........ ${geo.bodyOverflowY}  ${geo.bodyOverflowY === "visible" ? "OK (Lenis vivo)" : "FALHOU"}`);
  log(`  h1 line/font ........... ${geo.h1Ratio} (${geo.h1Font}px)  ${geo.h1Ratio >= 0.9 ? "OK" : "FALHOU"}`);
  log(`  h2 line/font ........... ${geo.h2Ratio}  ${geo.h2Ratio >= 0.9 ? "OK" : "FALHOU"}`);
  log(`  chars com gradiente .... ${geo.charsPainted}/5`);
  log(`  hero visível na abertura  char=${geo.charOpacity} cue=${geo.cueOpacity}`);
  log(`  capítulo escondido ..... ${geo.chapterOpacity} ${geo.chapterOpacity === 0 ? "OK" : "FALHOU"}`);
  log(`  tier / trilho .......... ${geo.tier} · ${Math.round(geo.trackH / geo.vh)}vh`);

  await page.screenshot({ path: `${OUT}/${name}-00-hero.png` });

  // três paradas da narrativa
  for (const [p, tag] of [
    [0.42, "01-vision-in"],
    [0.55, "02-vision-hold"],
    [0.95, "03-blackout"],
  ]) {
    await page.evaluate((prog) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, max * prog);
    }, p);
    await sleep(1600); // damp do vídeo + scrub precisam assentar
    await page.screenshot({ path: `${OUT}/${name}-${tag}.png` });
  }
}

/* ── 2. o scroll comanda o vídeo nos dois sentidos ──────────────────────── */
await page.setViewport({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: "networkidle2" });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => {
  const v = document.querySelector("video");
  return v && v.readyState >= 2;
}, { timeout: 45000 });
await sleep(1200);

const seekAt = async (p) => {
  await page.evaluate((prog) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, max * prog);
  }, p);
  await sleep(1500);
  return page.evaluate(() => {
    const v = document.querySelector("video");
    return { t: +v.currentTime.toFixed(2), dur: +v.duration.toFixed(2) };
  });
};

log("\n── scrub do vídeo (1440x900) ──");
const down = [];
for (const p of [0, 0.25, 0.5, 0.75, 1]) down.push({ p, ...(await seekAt(p)) });
const up = [];
for (const p of [0.75, 0.5, 0.25, 0]) up.push({ p, ...(await seekAt(p)) });

log(`  duração do clipe ....... ${down[0].dur}s`);
log("  descendo: " + down.map((d) => `${d.p}→${d.t}s`).join("  "));
log("  subindo:  " + up.map((d) => `${d.p}→${d.t}s`).join("  "));

const monotonicDown = down.every((d, i) => i === 0 || d.t > down[i - 1].t);
const monotonicUp = up.every((d, i) => i === 0 || d.t < up[i - 1].t);
const tracksProgress = down.every((d) => Math.abs(d.t - d.p * d.dur) < 0.6);
log(`  avança ao descer ....... ${monotonicDown ? "OK" : "FALHOU"}`);
log(`  retrocede ao subir ..... ${monotonicUp ? "OK" : "FALHOU"}`);
log(`  segue o progresso ...... ${tracksProgress ? "OK" : "FALHOU (>0.6s de erro)"}`);

/* ── 3. Lenis realmente intercepta a roda ───────────────────────────────── */
await page.evaluate(() => {
  window.__wheel = { seen: 0, prevented: 0 };
  addEventListener(
    "wheel",
    (e) => {
      window.__wheel.seen++;
      if (e.defaultPrevented) window.__wheel.prevented++;
    },
    { passive: true }
  );
});
await page.evaluate(() => {
  // A classe só existe ENQUANTO rola; amostrar depois de assentar dá falso negativo.
  window.__smooth = false;
  window.__classId = setInterval(() => {
    if (document.documentElement.classList.contains("lenis-smooth")) window.__smooth = true;
  }, 16);
});
await page.mouse.move(720, 450);
for (let i = 0; i < 8; i++) {
  await page.mouse.wheel({ deltaY: 220 });
  await sleep(60);
}
await sleep(400);
const wheel = await page.evaluate(() => {
  clearInterval(window.__classId);
  return { ...window.__wheel, smooth: window.__smooth };
});
log("\n── Lenis ──");
log(`  wheel preventDefault ... ${wheel.prevented}/${wheel.seen}  ${wheel.prevented > 0 ? "OK" : "FALHOU (quem rola é o navegador)"}`);
log(`  classe lenis-smooth .... ${wheel.smooth ? "OK" : "ausente"}`);

/* ── 4. framerate durante o scrub ───────────────────────────────────────── */
log("\n── framerate durante o scrub ──");
await page.evaluate(() => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, max * 0.12);
});
await sleep(900);
await page.evaluate(() => {
  window.__fps = [];
  let last = performance.now();
  window.__rafId = requestAnimationFrame(function loop(now) {
    window.__fps.push(now - last);
    last = now;
    window.__rafId = requestAnimationFrame(loop);
  });
});
for (let i = 0; i < 60; i++) {
  await page.mouse.wheel({ deltaY: 120 });
  await sleep(16);
}
const fps = await page.evaluate(() => {
  cancelAnimationFrame(window.__rafId);
  const d = window.__fps.slice(5).sort((a, b) => a - b);
  const at = (q) => d[Math.floor(d.length * q)];
  return {
    frames: d.length,
    median: +(1000 / at(0.5)).toFixed(1),
    p95worst: +(1000 / at(0.95)).toFixed(1),
    longest: +at(d.length - 1 >= 0 ? 0.999 : 0).toFixed(1),
  };
});
log(`  quadros medidos ........ ${fps.frames}`);
log(`  FPS mediano ............ ${fps.median}`);
log(`  FPS no percentil 95 .... ${fps.p95worst}`);
log(`  pior quadro ............ ${fps.longest}ms`);

/* ── 5. will-change órfão ───────────────────────────────────────────────── */
const willChange = await page.evaluate(() =>
  [...document.querySelectorAll("*")]
    .filter((el) => {
      const wc = getComputedStyle(el).willChange;
      return wc && wc !== "auto";
    })
    .map((el) => `${el.tagName.toLowerCase()}.${el.className || "-"} → ${getComputedStyle(el).willChange}`)
);
log("\n── will-change em repouso ──");
log(willChange.length ? willChange.map((s) => "  " + s).join("\n") : "  nenhum  OK");

/* ── 6. prefers-reduced-motion ──────────────────────────────────────────── */
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(URL, { waitUntil: "networkidle2" });
await page.evaluate(() => document.fonts.ready);
await sleep(2500);
const reduced = await page.evaluate(() => {
  const chars = [...document.querySelectorAll(".hero__char")];
  return {
    charOpacity: +getComputedStyle(chars[0]).opacity,
    subOpacity: +getComputedStyle(document.querySelector(".hero__sub")).opacity,
    cueOpacity: +getComputedStyle(document.querySelector(".hero__cue")).opacity,
    videoTransform: getComputedStyle(document.querySelector(".stage__video") || document.querySelector(".stage__poster")).transform,
  };
});
await page.screenshot({ path: `${OUT}/reduced-00-hero.png` });
await page.evaluate(() => {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo(0, max * 0.45);
});
await sleep(1800);
const reducedMid = await page.evaluate(() => ({
  chapter: +getComputedStyle(document.querySelector(".chapter")).opacity,
  videoTime: document.querySelector("video") ? +document.querySelector("video").currentTime.toFixed(2) : null,
}));
await page.screenshot({ path: `${OUT}/reduced-01-vision.png` });

log("\n── prefers-reduced-motion ──");
log(`  hero legível ........... char=${reduced.charOpacity} sub=${reduced.subOpacity} cue=${reduced.cueOpacity}`);
log(`  capítulo aparece ....... ${reducedMid.chapter}  ${reducedMid.chapter > 0.9 ? "OK" : "FALHOU"}`);
log(`  sequência preservada ... vídeo em ${reducedMid.videoTime}s  ${reducedMid.videoTime > 5 ? "OK" : "FALHOU"}`);

/* ── resumo ─────────────────────────────────────────────────────────────── */
log("\n── console e rede ──");
log(errors.length ? errors.map((e) => "  ERRO " + e).join("\n") : "  sem erros de console  OK");
log(bad.length ? bad.map((e) => "  " + e).join("\n") : "  nenhuma resposta 4xx/5xx  OK");
log(`\nscreenshots em ${OUT}`);

await browser.close();
