/**
 * Verificação da experiência: mede em vez de confiar na leitura do código.
 *   node scripts/verify.mjs [url] [outDir]
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] || "http://localhost:5376/";
const OUT = process.argv[3] || "./.verify";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(...a);
const ok = (cond) => (cond ? "OK" : "FALHOU");

/**
 * Leva a seção ao topo e CONFERE que chegou.
 * Rolar de uma vez por `getBoundingClientRect` erra sempre que há uma seção
 * pinada no caminho: o pin-spacer muda o layout durante a rolagem e o destino
 * se desloca. Uma correção depois de assentar basta.
 */
async function irPara(page, id, espera = 1600) {
  for (let i = 0; i < 3; i++) {
    const delta = await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      return el.getBoundingClientRect().top;
    }, id);
    if (Math.abs(delta) < 4) break;
    await page.evaluate((d) => window.scrollTo(0, window.scrollY + d), delta);
    await new Promise((r) => setTimeout(r, espera));
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  // SOFT_GL=1 força WebGL por software (reprodutível em CI, mas mede o
  // piso do renderizador, não o do site). Sem a variável, usa a GPU real.
  args: [
    "--no-sandbox",
    "--mute-audio",
    ...(process.env.SOFT_GL
      ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
      : []),
  ],
});

const errors = [];
const bad = [];

const page = await browser.newPage();
/* O Chrome headless reporta `prefers-reduced-motion: reduce` por padrão.
   Sem desligar isso explicitamente, TODA verificação mede o caminho reduzido
   e conclui que o site funciona — enquanto nada do movimento real é testado. */
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("response", (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));

/* ── 1. geometria e tipografia em três larguras ─────────────────────────── */
for (const [w, h, name] of [
  [375, 812, "mobile"],
  [768, 1024, "tablet"],
  [1440, 900, "desktop"],
]) {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "networkidle2" });
  await page.evaluate(() => document.fonts.ready);
  await sleep(4000); // deixa a abertura terminar

  const geo = await page.evaluate(() => {
    const doc = document.documentElement;
    const ratio = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const s = getComputedStyle(el);
      const fs = parseFloat(s.fontSize);
      return +((parseFloat(s.lineHeight) || fs) / fs).toFixed(3);
    };
    const chars = [...document.querySelectorAll(".hero__char")];
    return {
      overflowX: doc.scrollWidth - window.innerWidth,
      bodyOverflowY: getComputedStyle(document.body).overflowY,
      markRatio: ratio(".hero__mark"),
      secRatio: ratio(".sec__title"),
      markFont: Math.round(parseFloat(getComputedStyle(document.querySelector(".hero__mark")).fontSize)),
      charsPintados: chars.filter((el) => el.style.backgroundImage.includes("gradient")).length,
      charOpacity: +getComputedStyle(chars[0]).opacity,
      cueOpacity: +getComputedStyle(document.querySelector(".hero__cue")).opacity,
      navVisivel: document.querySelector(".nav").dataset.visible,
      tier: document.querySelector(".stage").dataset.tier,
      telas: Math.round(doc.scrollHeight / window.innerHeight),
      secoes: document.querySelectorAll(".sec").length,
    };
  });

  log(`\n── ${name} ${w}x${h} ──`);
  log(`  overflow-x extra ....... ${geo.overflowX}px  ${ok(geo.overflowX === 0)}`);
  log(`  body overflow-y ........ ${geo.bodyOverflowY}  ${ok(geo.bodyOverflowY === "visible")} (Lenis)`);
  log(`  wordmark linha/fonte ... ${geo.markRatio} (${geo.markFont}px)  ${ok(geo.markRatio >= 0.9)}`);
  log(`  h2 linha/fonte ......... ${geo.secRatio}  ${ok(geo.secRatio >= 0.9)}`);
  log(`  chars com gradiente .... ${geo.charsPintados}/5`);
  log(`  hero na abertura ....... char=${geo.charOpacity} cue=${geo.cueOpacity}`);
  log(`  nav escondida na hero .. ${geo.navVisivel}  ${ok(geo.navVisivel === "false")}`);
  log(`  tier / seções / altura . ${geo.tier} · ${geo.secoes} seções · ${geo.telas} telas`);

  await page.screenshot({ path: `${OUT}/${name}-00-hero.png` });
}

/* ── 2. acentos: nada de til decepado nos títulos ───────────────────────── */
await page.setViewport({ width: 1440, height: 900 });
await page.goto(URL, { waitUntil: "networkidle2" });
await page.evaluate(() => document.fonts.ready);
await sleep(3000);

const acentos = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll(".sec__title").forEach((h2) => {
    const rotulo = h2.getAttribute("aria-label") || "";
    if (!/[ÃÕÂÊÔÁÉÍÓÚÇàáâãéêíóôõúç]/i.test(rotulo)) return;
    [...h2.children].forEach((mask) => {
      const linha = mask.firstElementChild;
      if (!linha) return;
      const cs = getComputedStyle(linha);
      out.push({
        rotulo,
        // O padding da linha afasta a tinta do topo da caixa de fundo — é ele
        // que salva o til do clipe da máscara E do recorte do gradiente.
        folgaAcima: parseFloat(cs.paddingTop),
        recorte: getComputedStyle(mask).overflow,
      });
    });
  });
  return out;
});

log("\n── folga para acentos nos títulos ──");
const semFolga = acentos.filter((a) => a.folgaAcima < 8);
acentos.forEach((a) => log(`  ${a.rotulo.slice(0, 28).padEnd(30)} folga ${a.folgaAcima}px`));
log(`  todas com folga ........ ${ok(semFolga.length === 0)}`);

/* ── 3. o scroll comanda o vídeo nos dois sentidos ──────────────────────── */
await page.waitForFunction(
  () => {
    const v = document.querySelector("video");
    return v && v.readyState >= 2;
  },
  { timeout: 45000 }
);
await sleep(1200);

const seekAt = async (p) => {
  await page.evaluate((prog) => {
    const track = document.querySelector(".track");
    window.scrollTo(0, (track.offsetHeight - window.innerHeight) * prog);
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
log(`  avança ao descer ....... ${ok(down.every((d, i) => i === 0 || d.t > down[i - 1].t))}`);
log(`  retrocede ao subir ..... ${ok(up.every((d, i) => i === 0 || d.t < up[i - 1].t))}`);
log(`  segue o progresso ...... ${ok(down.every((d) => Math.abs(d.t - d.p * d.dur) < 0.7))}`);

/* ── 4. Lenis realmente intercepta a roda ───────────────────────────────── */
await page.evaluate(() => {
  window.__wheel = { seen: 0, prevented: 0 };
  window.__smooth = false;
  addEventListener(
    "wheel",
    (e) => {
      window.__wheel.seen++;
      if (e.defaultPrevented) window.__wheel.prevented++;
    },
    { passive: true }
  );
  // A classe só existe ENQUANTO rola; amostrar depois dá falso negativo.
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
log(`  wheel preventDefault ... ${wheel.prevented}/${wheel.seen}  ${ok(wheel.prevented > 0)}`);
log(`  classe lenis-smooth .... ${ok(wheel.smooth)}`);

/* ── 5. framerate com vídeo + shader + 3D ao mesmo tempo ────────────────── */
const medirFps = async (rotulo) => {
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
  const r = await page.evaluate(() => {
    cancelAnimationFrame(window.__rafId);
    const d = window.__fps.slice(5).sort((a, b) => a - b);
    const at = (q) => d[Math.min(d.length - 1, Math.floor(d.length * q))];
    return { n: d.length, mediano: +(1000 / at(0.5)).toFixed(1), pior: +at(0.98).toFixed(1) };
  });
  log(`  ${rotulo.padEnd(24)} ${r.n} quadros · mediana ${r.mediano} fps · pior ${r.pior}ms`);
};

log(`\n── framerate (${process.env.SOFT_GL ? "software: piso, não teto" : "GPU real"}) ──`);
await page.evaluate(() => window.scrollTo(0, window.innerHeight * 0.6));
await sleep(900);
await medirFps("hero (vídeo+luz)");
await irPara(page, "servicos");
await sleep(900);
await medirFps("seções (luz+3D)");

/* ── 6. will-change órfão ───────────────────────────────────────────────── */
const wc = await page.evaluate(() =>
  [...document.querySelectorAll("*")]
    .filter((el) => {
      const v = getComputedStyle(el).willChange;
      return v && v !== "auto";
    })
    .map((el) => `${el.tagName.toLowerCase()}.${el.className || "-"} → ${getComputedStyle(el).willChange}`)
);
log("\n── will-change em repouso ──");
log(wc.length ? wc.map((s) => "  " + s).join("\n") : "  nenhum  OK");

/* ── 7. navegação: cada link chega onde promete ─────────────────────────── */
log("\n── navegação ──");
const alvos = await page.evaluate(() => [...document.querySelectorAll(".nav__links a, .nav__cta")].map((a) => a.getAttribute("href")));
for (const href of alvos) {
  await page.evaluate((h) => {
    const link = [...document.querySelectorAll(".nav__links a, .nav__cta")].find((a) => a.getAttribute("href") === h);
    link.click();
  }, href);
  await sleep(1800);
  const onde = await page.evaluate((h) => {
    const el = document.querySelector(h);
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  }, href);
  log(`  ${href.padEnd(12)} → topo da seção a ${onde}px  ${ok(Math.abs(onde) < 90)}`);
}

/* ── 7b. interações ─────────────────────────────────────────────────────── */
log("\n── interações ──");

// Abertura: some sozinha e devolve o scroll.
{
  const p2 = await browser.newPage();
  await p2.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await p2.setViewport({ width: 1440, height: 900 });
  await p2.goto(URL, { waitUntil: "domcontentloaded" });
  const inicial = await p2.evaluate(() => !!document.querySelector(".preloader"));
  await p2.waitForFunction(() => !document.querySelector(".preloader"), { timeout: 9000 }).catch(() => {});
  const depois = await p2.evaluate(() => ({
    sumiu: !document.querySelector(".preloader"),
    rolavel: document.documentElement.scrollHeight > window.innerHeight + 10,
  }));
  log(`  abertura aparece/some .. ${inicial} → ${depois.sumiu}  ${ok(inicial && depois.sumiu)}`);
  log(`  scroll liberado ........ ${ok(depois.rolavel)}`);
  await p2.close();
}

log(`  cursor customizado ..... ${ok(await page.evaluate(() => !!document.querySelector(".cursor")))}`);

/* Serviços: apontar uma frente acende ela, apaga as outras e troca o palco. */
await irPara(page, "servicos");
await sleep(700);
const mira = await page.evaluate(() => {
  /* Mira na primeira frente VISÍVEL que não seja a já ativa: a lista tem
     seis itens e os últimos ficam fora da tela quando a seção encosta no
     topo — mirar às cegas no terceiro acerta o vazio. */
  const linhas = [...document.querySelectorAll("[data-frentes] .frente__linha")];
  const alvo = linhas.find((l, i) => {
    const r = l.getBoundingClientRect();
    return i > 0 && r.top > 80 && r.bottom < window.innerHeight - 40;
  });
  const r = (alvo || linhas[1]).getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
});
await page.mouse.move(mira.x, mira.y);
await sleep(900);
const frente = await page.evaluate(() => {
  const itens = [...document.querySelectorAll("[data-frentes] [data-frente]")];
  const ativos = itens.filter((e) => e.dataset.active === "true").map((e) => e.dataset.frente);
  const palcos = [...document.querySelectorAll("[data-palco]")]
    .filter((p) => p.dataset.active === "true")
    .map((p) => p.dataset.palco);
  const aberta = itens.find((e) => e.dataset.active === "true")?.querySelector(".frente__entregas");
  return {
    ativos,
    palcos,
    entregasAbertas: aberta ? aberta.getBoundingClientRect().height > 20 : false,
  };
});
log(`  frente apontada ........ ${frente.ativos.join(",") || "nenhuma"}  ${ok(frente.ativos.length === 1)}`);
log(`  palco acompanha ........ ${frente.palcos.join(",") || "nenhum"}  ${ok(frente.palcos[0] === frente.ativos[0])}`);
log(`  entregas abrem ......... ${ok(frente.entregasAbertas)}`);

/* Audiovisual: o recorte do vídeo abre com o scroll. */
await irPara(page, "audiovisual");
await sleep(700);
const clipAntes = await page.evaluate(
  () => getComputedStyle(document.querySelector("[data-filme-janela]")).clipPath
);
await page.evaluate(() => window.scrollTo(0, window.scrollY + window.innerHeight * 1.4));
await sleep(1800);
// O vídeo carrega sob demanda (`preload="none"`): esperar é mais honesto
// que cronometrar e concluir que não toca.
await page
  .waitForFunction(() => !document.querySelector("[data-filme-video]").paused, { timeout: 8000 })
  .catch(() => {});
const clipDepois = await page.evaluate(() => ({
  clip: getComputedStyle(document.querySelector("[data-filme-janela]")).clipPath,
  tocando: !document.querySelector("[data-filme-video]").paused,
}));
const abriu = clipAntes !== clipDepois.clip;
log(`  vídeo toma a tela ...... ${abriu ? "abriu" : "parado"}  ${ok(abriu)}`);
log(`  vídeo tocando em cena .. ${ok(clipDepois.tocando)}`);

/* Sistema: as peças saem da bagunça e fecham em anel em torno da empresa. */
await irPara(page, "sistema");
await sleep(1000);
const pecaAntes = await page.evaluate(() => {
  const r = document.querySelector('[data-peca="post"]').getBoundingClientRect();
  return {
    x: Math.round(r.left),
    y: Math.round(r.top),
    estado: document.querySelector("[data-sistema-atual]").textContent,
  };
});
await page.evaluate(() => window.scrollTo(0, window.scrollY + window.innerHeight * 3));
await sleep(2400);
const pecaDepois = await page.evaluate(() => {
  const r = document.querySelector('[data-peca="post"]').getBoundingClientRect();
  return {
    x: Math.round(r.left),
    y: Math.round(r.top),
    estado: document.querySelector("[data-sistema-atual]").textContent,
    centro: +getComputedStyle(document.querySelector("[data-centro]")).opacity,
  };
});
const andou = Math.hypot(pecaDepois.x - pecaAntes.x, pecaDepois.y - pecaAntes.y) > 60;
log(`  peças se reorganizam ... ${pecaAntes.x},${pecaAntes.y} → ${pecaDepois.x},${pecaDepois.y}  ${ok(andou)}`);
log(`  estado avança .......... ${pecaAntes.estado} → ${pecaDepois.estado}  ${ok(pecaDepois.estado !== pecaAntes.estado)}`);
log(`  empresa no centro ...... opacidade ${pecaDepois.centro}  ${ok(pecaDepois.centro > 0.9)}`);

/* Botão magnético e alcance do CTA. */
await irPara(page, "contato");
await sleep(900);
const btn = await page.evaluate(() => {
  const r = document.querySelector(".btn").getBoundingClientRect();
  return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
});
const antesBtn = await page.evaluate(() => document.querySelector(".btn").getBoundingClientRect().left);
await page.mouse.move(btn.x + 55, btn.y);
await sleep(700);
const depoisBtn = await page.evaluate(() => document.querySelector(".btn").getBoundingClientRect().left);
await page.mouse.move(60, 60);
await sleep(1100);
const voltouBtn = await page.evaluate(() => document.querySelector(".btn").getBoundingClientRect().left);
log(
  `  botão magnético ........ ${Math.round(antesBtn)} → ${Math.round(depoisBtn)} → ${Math.round(voltouBtn)}  ${ok(
    depoisBtn > antesBtn + 4 && Math.abs(voltouBtn - antesBtn) < 3
  )}`
);

const alcance = await page.evaluate(() => {
  const r = document.querySelector(".btn").getBoundingClientRect();
  const alvo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  return { atinge: !!alvo?.closest(".btn"), obstaculo: alvo ? `${alvo.tagName}.${alvo.className}` : "-" };
});
log(`  botão clicável ......... ${alcance.obstaculo}  ${ok(alcance.atinge)}`);

/* Rodapé: no fim da página aparece e nada da cena o cobre. */
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await sleep(1600);
const rodape = await page.evaluate(() => {
  const f = document.querySelector(".footer");
  const r = f.getBoundingClientRect();
  const meio = document.elementFromPoint(window.innerWidth / 2, r.top + r.height / 2);
  return {
    visivel: r.top < window.innerHeight && r.bottom > 0,
    porCima: meio ? meio.closest(".footer") !== null : false,
  };
});
log(`  rodapé revelado ........ visível=${rodape.visivel} alcançável=${rodape.porCima}  ${ok(rodape.visivel && rodape.porCima)}`);
await page.screenshot({ path: `${OUT}/desktop-99-rodape.png` });

/* ── 8. prefers-reduced-motion ──────────────────────────────────────────── */
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(URL, { waitUntil: "networkidle2" });
await page.evaluate(() => document.fonts.ready);
await sleep(2800);

const reduzHero = await page.evaluate(() => ({
  char: +getComputedStyle(document.querySelector(".hero__char")).opacity,
  sub: +getComputedStyle(document.querySelector(".hero__sub")).opacity,
  cue: +getComputedStyle(document.querySelector(".hero__cue")).opacity,
}));
await page.screenshot({ path: `${OUT}/reduced-00-hero.png` });

await page.evaluate(() => {
  const el = document.getElementById("prova");
  window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top);
});
await sleep(2000);
const reduzSec = await page.evaluate(() => {
  const t = document.querySelector('[data-sec="prova"] .sec__title div div');
  const item = document.querySelector('[data-sec="prova"] [data-sec-item]');
  return {
    titulo: t ? +getComputedStyle(t).opacity : null,
    item: +getComputedStyle(item).opacity,
    video: document.querySelector("video") ? +document.querySelector("video").currentTime.toFixed(2) : null,
  };
});
await page.screenshot({ path: `${OUT}/reduced-01-prova.png` });

log("\n── prefers-reduced-motion ──");
log(`  hero legível ........... char=${reduzHero.char} sub=${reduzHero.sub} cue=${reduzHero.cue}  ${ok(reduzHero.char === 1 && reduzHero.cue === 1)}`);
log(`  seção completa ......... título=${reduzSec.titulo} item=${reduzSec.item}  ${ok(reduzSec.item > 0.9)}`);
log(`  sequência preservada ... vídeo em ${reduzSec.video}s  ${ok(reduzSec.video > 15)}`);

/* ── resumo ─────────────────────────────────────────────────────────────── */
log("\n── console e rede ──");
log(errors.length ? errors.slice(0, 10).map((e) => "  ERRO " + e).join("\n") : "  sem erros de console  OK");
log(bad.length ? bad.slice(0, 10).map((e) => "  " + e).join("\n") : "  nenhuma resposta 4xx/5xx  OK");
log(`\nscreenshots em ${OUT}`);

await browser.close();
