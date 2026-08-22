/**
 * Verificação da experiência: MEDE, em vez de confiar na leitura do código.
 *
 *   node scripts/verify.mjs [url] [outDir]
 *
 * A regra deste arquivo: cada checagem tem de poder FALHAR por um motivo real.
 * Uma asserção que só confirma que um elemento existe no DOM não prova nada —
 * o que quebra numa página assim é geometria, ordem de ScrollTrigger e estado
 * que não volta. É isso que se mede aqui.
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const URL = process.argv[2] || "http://localhost:5402/";
const OUT = process.argv[3] || "./.verify";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Lê a sonda da cena 3D. Serializa DENTRO da página: devolver o objeto
 *  cru pelo canal do Puppeteer vinha como `undefined`. */
const lerCena = async (page) => {
  const bruto = await page.evaluate(() =>
    window.__cena ? JSON.stringify(window.__cena()) : ""
  );
  return bruto ? JSON.parse(bruto) : null;
};
const log = (...a) => console.log(...a);

let passou = 0;
let falhou = 0;
const falhas = [];

function checar(nome, cond, detalhe = "") {
  if (cond) {
    passou += 1;
    log(`  OK   ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  } else {
    falhou += 1;
    falhas.push(`${nome}${detalhe ? ` — ${detalhe}` : ""}`);
    log(`  FALHA ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
  }
}

/**
 * Leva uma seção ao topo e CONFERE que chegou.
 * Rolar de uma vez pelo `getBoundingClientRect` erra sempre que há seção presa
 * no caminho: o espaçador do pin muda o layout durante a rolagem e o destino se
 * desloca. Uma correção depois de assentar basta.
 */
async function irPara(page, id, espera = 1100) {
  for (let i = 0; i < 5; i++) {
    const delta = await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      return el ? el.getBoundingClientRect().top : 0;
    }, id);
    if (Math.abs(delta) < 6) break;
    await page.evaluate((d) => window.scrollTo(0, window.scrollY + d), delta);
    await sleep(espera);
  }
  await sleep(600);
}

/** Rola para uma fração do documento. */
async function fracao(page, f, espera = 1200) {
  await page.evaluate((x) => {
    const alt = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, alt * x);
  }, f);
  await sleep(espera);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: [
    "--no-sandbox",
    "--mute-audio",
    // Sem isto o vídeo da tela do notebook nunca decodifica em headless, e a
    // checagem da textura mede o navegador, não o site.
    "--autoplay-policy=no-user-gesture-required",
    ...(process.env.SOFT_GL
      ? ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"]
      : []),
  ],
});

const erros = [];
const ruins = [];

const page = await browser.newPage();
/* O Chrome headless reporta `prefers-reduced-motion: reduce` por padrão. Sem
   desligar isso explicitamente, TODA verificação mede o caminho reduzido e
   conclui que o site funciona — enquanto nada do movimento real é testado. */
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
page.on("console", (m) => m.type() === "error" && erros.push(m.text()));
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
page.on("response", (r) => r.status() >= 400 && ruins.push(`${r.status()} ${r.url()}`));

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle2" });
await sleep(3000);

/* ═══ 1 · O caminho do notebook ═══════════════════════════════════════════
   A exigência do briefing é literal: "o laptop não pode teletransportar".
   Isso é verificável — amostra-se a pose ao longo da página e confere-se que
   ela chega em cada parada prevista e que nenhum salto é grande demais para
   ter sido percorrido à vista. */
log("\n── Caminho do notebook ──");

const PARADAS = [
  ["manifesto", 1.34, -0.42],
  ["social", -0.8, -0.66],
  ["web", 0, -0.16],
  ["design", -1.5, -0.42],
  ["contato", 0, -0.58],
];

const trajeto = [];
for (const [id, ax, ay] of PARADAS) {
  await irPara(page, id);
  const pose = await lerCena(page);
  if (!pose) {
    checar(`pose em ${id}`, false, "sonda window.__cena ausente");
    continue;
  }
  trajeto.push({ id, ...pose });
  const perto = Math.abs(pose.x - ax) < 0.12 && Math.abs(pose.y - ay) < 0.12;
  checar(`pose alvo em ${id}`, perto, `x=${pose.x.toFixed(2)} y=${pose.y.toFixed(2)}`);
}

/* Continuidade: amostragem densa e nenhum salto brusco entre amostras
   vizinhas. Um "teletransporte" apareceria aqui como um degrau. */
const amostras = [];
for (let i = 0; i <= 30; i++) {
  await fracao(page, 0.1 + (i / 30) * 0.88, 260);
  const p = await lerCena(page);
  if (p) amostras.push(p.x);
}
let maiorSalto = 0;
for (let i = 1; i < amostras.length; i++) {
  maiorSalto = Math.max(maiorSalto, Math.abs(amostras[i] - amostras[i - 1]));
}
checar(
  "trajeto sem degrau",
  amostras.length > 20 && maiorSalto < 2.2,
  `maior salto entre amostras: ${maiorSalto.toFixed(2)} (em ${amostras.length} pontos)`
);

/* ═══ 2 · A tela do notebook está viva ════════════════════════════════════ */
log("\n── Tela do notebook ──");
await irPara(page, "web");
const canais = [];
for (const id of ["social", "web", "design", "clientes"]) {
  await irPara(page, id);
  const c = await lerCena(page);
  canais.push(c?.canal ?? null);
}
checar(
  "canal da tela troca por seção",
  new Set(canais.filter(Boolean)).size >= 3,
  canais.join(" → ")
);

/* ═══ 3 · Seções presas ═══════════════════════════════════════════════════
   Um pin que não engata é um scroll que passa reto pela experiência inteira.
   Mede-se pelo espaçador que o ScrollTrigger insere. */
log("\n── Pins ──");
const pins = await page.evaluate(() =>
  [...document.querySelectorAll(".pin-spacer")].map((s) => {
    const alvo = s.querySelector("[data-sec]");
    return { sec: alvo?.dataset.sec || "?", altura: Math.round(s.offsetHeight) };
  })
);
checar("seis seções presas", pins.length >= 6, pins.map((p) => `${p.sec}:${p.altura}px`).join(" "));
for (const p of pins) {
  checar(`  pin de ${p.sec} com curso`, p.altura > 1800, `${p.altura}px`);
}

/* ═══ 4 · Social: o feed se monta ═════════════════════════════════════════ */
log("\n── Social: o feed ──");
await irPara(page, "social");
const estadosSociais = [];
const secSocial = await page.evaluate(() => {
  const s = document.getElementById("social");
  const sp = s.closest(".pin-spacer") || s;
  return { topo: window.scrollY + sp.getBoundingClientRect().top, alt: sp.offsetHeight };
});
for (const f of [0.08, 0.5, 0.92]) {
  await page.evaluate((y) => window.scrollTo(0, y), secSocial.topo + secSocial.alt * f);
  await sleep(1400);
  estadosSociais.push(
    await page.evaluate(() => document.querySelector("[data-social-palco]")?.dataset.estado)
  );
}
checar(
  "três estados do feed",
  new Set(estadosSociais).size === 3,
  estadosSociais.join(" → ")
);

const gradeFeed = await page.evaluate(() => {
  const p = document.querySelector("[data-social-palco]");
  const pecas = [...p.querySelectorAll(".peca")].map((e) => e.getBoundingClientRect());
  // Numa grade, as peças de uma mesma linha compartilham o topo.
  const topos = new Set(pecas.map((r) => Math.round(r.top / 8)));
  return { n: pecas.length, linhas: topos.size };
});
checar(
  "as peças formam grade",
  gradeFeed.n === 6 && gradeFeed.linhas <= 3,
  `${gradeFeed.n} peças em ${gradeFeed.linhas} linhas`
);

/* ═══ 5 · Web: a câmera entra na tela ═════════════════════════════════════ */
log("\n── Web: entrar na tela ──");
const secWeb = await page.evaluate(() => {
  const s = document.getElementById("web");
  const sp = s.closest(".pin-spacer") || s;
  return { topo: window.scrollY + sp.getBoundingClientRect().top, alt: sp.offsetHeight };
});
let zoomMax = 0;
let clipMax = 0;
for (const f of [0.1, 0.35, 0.5, 0.62, 0.72, 0.8, 0.97]) {
  await page.evaluate((y) => window.scrollTo(0, y), secWeb.topo + secWeb.alt * f);
  await sleep(1100);
  const m = await page.evaluate(() => {
    const z = window.__cena ? window.__cena().zoom : 0;
    const d = document.querySelector("[data-web-dentro]");
    const cp = d ? getComputedStyle(d).clipPath : "";
    const pc = /circle\(([\d.]+)/.exec(cp);
    return { z, clip: pc ? Number(pc[1]) : 0 };
  });
  zoomMax = Math.max(zoomMax, m.z);
  clipMax = Math.max(clipMax, m.clip);
}
checar("a câmera chega à tela cheia", zoomMax > 0.9, `zoom máximo ${zoomMax.toFixed(2)}`);
checar("a página nasce dentro do painel", clipMax > 40, `clip-path até ${clipMax}%`);

await page.evaluate((y) => window.scrollTo(0, y), secWeb.topo + secWeb.alt + 400);
await sleep(1600);
const zoomDepois = (await lerCena(page))?.zoom ?? 1;
checar(
  "a câmera recua ao sair",
  zoomDepois < 0.15,
  `zoom ${zoomDepois.toFixed(2)} depois do pin`
);

/* ═══ 6 · Design: a interface vira grade editorial ════════════════════════ */
log("\n── Design: a transformação ──");
const secDesign = await page.evaluate(() => {
  const s = document.getElementById("design");
  const sp = s.closest(".pin-spacer") || s;
  return { topo: window.scrollY + sp.getBoundingClientRect().top, alt: sp.offsetHeight };
});
await page.evaluate((y) => window.scrollTo(0, y), secDesign.topo + secDesign.alt * 0.75);
await sleep(1600);
const cartazes = await page.evaluate(() =>
  [...document.querySelectorAll(".cartaz")].map((c) => {
    const r = c.getBoundingClientRect();
    return { a: c.dataset.area, w: Math.round(r.width), h: Math.round(r.height) };
  })
);
const cartazesReais = cartazes.filter((c) => c.w > 40 && c.h > 40).length;
checar(
  "os cartazes ocupam as áreas do grid",
  cartazesReais === 6,
  `${cartazesReais}/6 com tamanho real`
);
const tamanhosDiferentes = new Set(cartazes.map((c) => `${c.w}x${c.h}`)).size;
checar(
  "a grade é assimétrica",
  tamanhosDiferentes >= 4,
  `${tamanhosDiferentes} tamanhos distintos`
);

/* ═══ 7 · Branding: a marca é desenhada ═══════════════════════════════════ */
log("\n── Branding: a construção ──");
const secBrand = await page.evaluate(() => {
  const s = document.getElementById("branding");
  const sp = s.closest(".pin-spacer") || s;
  return { topo: window.scrollY + sp.getBoundingClientRect().top, alt: sp.offsetHeight };
});
const desenho = [];
for (const f of [0.05, 0.45, 0.9]) {
  await page.evaluate((y) => window.scrollTo(0, y), secBrand.topo + secBrand.alt * f);
  await sleep(1300);
  desenho.push(
    await page.evaluate(() => {
      const t = document.querySelector("[data-bd-traco]");
      /* O DrawSVG desenha encolhendo o PRIMEIRO valor do dash-array: ele vai
         de 0 ao comprimento do traço. O dash-offset fica praticamente parado
         em zero — medi-lo não diz nada sobre o progresso. */
      const arr = t ? parseFloat(getComputedStyle(t).strokeDasharray) || 0 : -1;
      const massa = document.querySelector("[data-bd-massa]");
      return { arr: Math.round(arr), massa: massa ? +getComputedStyle(massa).opacity : -1 };
    })
  );
}
checar(
  "o símbolo é traçado pelo scroll",
  desenho[2].arr > desenho[0].arr + 100,
  `comprimento desenhado ${desenho.map((d) => d.arr).join(" → ")}px`
);
checar("o símbolo ganha massa", desenho[2].massa > 0.8, `opacidade ${desenho[2].massa}`);

/* ═══ 8 · Estratégia: rótulo e ponto na MESMA geometria ═══════════════════
   O SVG é encaixado com "meet" e os rótulos são DOM em porcentagem. Se as
   duas geometrias divergirem, cada nome pousa longe do próprio ponto — e é
   um erro que nenhuma asserção de existência pegaria. */
log("\n── Estratégia: alinhamento ──");
await irPara(page, "estrategia");
const secEst = await page.evaluate(() => {
  const s = document.getElementById("estrategia");
  const sp = s.closest(".pin-spacer") || s;
  return { topo: window.scrollY + sp.getBoundingClientRect().top, alt: sp.offsetHeight };
});
await page.evaluate((y) => window.scrollTo(0, y), secEst.topo + secEst.alt * 0.6);
await sleep(1600);
const desvio = await page.evaluate(() => {
  const rot = document.querySelector('[data-est-rotulo="publico"]');
  const pt = document.querySelector('[data-est-ponto][data-id="publico"]');
  if (!rot || !pt) return null;
  const a = rot.getBoundingClientRect();
  const b = pt.getBoundingClientRect();
  return Math.round(Math.abs(a.left + a.width / 2 - (b.left + b.width / 2)));
});
checar("rótulo alinhado ao ponto", desvio !== null && desvio < 18, `${desvio}px de desvio`);

const convergencia = await page.evaluate(() => {
  const feixe = [...document.querySelectorAll("[data-est-feixe]")];
  const desenhado = feixe.filter(
    (l) => (parseFloat(getComputedStyle(l).strokeDashoffset) || 0) < 6
  ).length;
  return { total: feixe.length, desenhado };
});
checar(
  "o feixe converge",
  convergencia.desenhado >= convergencia.total - 1,
  `${convergencia.desenhado}/${convergencia.total} linhas traçadas`
);

/* ═══ 9 · Máquina Prime ═══════════════════════════════════════════════════ */
log("\n── Máquina Prime ──");
const secMaq = await page.evaluate(() => {
  const s = document.getElementById("metodo");
  const sp = s.closest(".pin-spacer") || s;
  return { topo: window.scrollY + sp.getBoundingClientRect().top, alt: sp.offsetHeight };
});
const etapasVistas = new Set();
for (const f of [0.34, 0.42, 0.5, 0.58, 0.66, 0.73]) {
  await page.evaluate((y) => window.scrollTo(0, y), secMaq.topo + secMaq.alt * f);
  await sleep(1500);
  const idx = await page.evaluate(() =>
    [...document.querySelectorAll("[data-maquina-etapa]")].findIndex(
      (el) => +getComputedStyle(el).opacity > 0.7
    )
  );
  if (idx >= 0) etapasVistas.add(idx);
}
checar("as etapas se revezam", etapasVistas.size >= 3, `etapas vistas: ${[...etapasVistas].join(",")}`);

await page.evaluate((y) => window.scrollTo(0, y), secMaq.topo + secMaq.alt * 0.95);
await sleep(1500);
const saidas = await page.evaluate(
  () =>
    [...document.querySelectorAll("[data-maquina-saida]")].filter(
      (e) => +getComputedStyle(e).opacity > 0.6
    ).length
);
checar("as sete entregas saem", saidas === 7, `${saidas}/7 visíveis`);

/* ═══ 10 · Por que funciona: a demonstração muda o layout ════════════════ */
log("\n── Por que funciona ──");
await irPara(page, "porque");
const posicoes = {};
for (const demo of ["alinhar", "refinar", "apontar"]) {
  const alvo = await page.evaluate((d) => {
    const li = [...document.querySelectorAll("[data-forca]")].find((e) => e.dataset.forca === d);
    if (!li) return null;
    const r = li.getBoundingClientRect();
    return { x: r.left + 60, y: r.top + 14 };
  }, demo);
  if (!alvo) continue;
  await page.mouse.move(alvo.x, alvo.y);
  await sleep(1500);
  posicoes[demo] = await page.evaluate(() =>
    [...document.querySelectorAll("[data-palco-peca]")].map((e) => {
      const r = e.getBoundingClientRect();
      return `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)}`;
    }).join("|")
  );
}
const arranjos = new Set(Object.values(posicoes));
checar(
  "cada força reorganiza o palco",
  arranjos.size === Object.keys(posicoes).length && arranjos.size >= 3,
  `${arranjos.size} arranjos distintos`
);
const eixo = await page.evaluate(
  () => +getComputedStyle(document.querySelector("[data-palco-eixo]").parentElement).opacity
);
checar("o eixo aparece só em DIREÇÃO", eixo > 0.8, `opacidade ${eixo}`);

/* ═══ 11 · Clientes ═══════════════════════════════════════════════════════ */
log("\n── Clientes ──");
await irPara(page, "clientes");
const links = await page.evaluate(() =>
  [...document.querySelectorAll(".perfil__link")].map((a) => a.href)
);
checar(
  "links reais para os perfis",
  links.includes("https://www.instagram.com/realpisos/") &&
    links.includes("https://www.instagram.com/fisiowandersoncarvalho/"),
  links.join(" ")
);
checar(
  "sem iframe do Instagram",
  await page.evaluate(() => !document.querySelector('iframe[src*="instagram"]')),
  "preview construído com assets do projeto"
);

const alvoMarca = await page.evaluate(() => {
  const m = document.querySelector('[data-marca="real-pisos"] .marca__selo');
  const r = m.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
const antesHover = await page.evaluate(
  () => document.querySelector('[data-marca="real-pisos"] .perfil').getBoundingClientRect().height
);
await page.mouse.move(alvoMarca.x, alvoMarca.y);
await sleep(1400);
const depoisHover = await page.evaluate(
  () => document.querySelector('[data-marca="real-pisos"] .perfil').getBoundingClientRect().height
);
checar(
  "o preview abre no hover",
  depoisHover > antesHover + 80,
  `${Math.round(antesHover)}px → ${Math.round(depoisHover)}px`
);
const recuo = await page.evaluate(
  () => +getComputedStyle(document.querySelector('[data-marca="wanderson-carvalho"]')).opacity
);
checar("a outra marca recua", recuo < 0.6, `opacidade ${recuo}`);

const arco = await page.evaluate(() => {
  const p = document.querySelector("[data-quem-arco]");
  return Math.round(parseFloat(getComputedStyle(p).strokeDashoffset) || 0);
});
checar("o arco é desenhado", arco < 60, `dashoffset ${arco}`);

/* ═══ 12 · WhatsApp ═══════════════════════════════════════════════════════ */
log("\n── WhatsApp ──");
await page.evaluate(() => window.scrollTo(0, 0));
await sleep(1200);
const zapTopo = await page.evaluate(() => {
  const z = document.querySelector(".zap");
  return { vis: getComputedStyle(z).visibility, dado: z.dataset.visivel };
});
checar("escondido na hero", zapTopo.vis === "hidden", `visibility ${zapTopo.vis}`);

await irPara(page, "porque");
const zapDepois = await page.evaluate(() => {
  const z = document.querySelector(".zap");
  const a = z.querySelector("a");
  const cs = getComputedStyle(z.querySelector(".zap__botao"));
  return {
    vis: getComputedStyle(z).visibility,
    href: a.href,
    fundo: cs.backgroundColor,
  };
});
checar("aparece depois da hero", zapDepois.vis === "visible");
checar(
  "número correto",
  zapDepois.href.includes("5511912992403"),
  zapDepois.href.slice(0, 60)
);
checar(
  "dourado, não verde",
  /201,\s*168,\s*76/.test(zapDepois.fundo),
  zapDepois.fundo
);

/* ═══ 13 · Rodapé ═════════════════════════════════════════════════════════ */
log("\n── Rodapé ──");
await page.evaluate(() =>
  window.scrollTo(0, document.documentElement.scrollHeight)
);
await sleep(2000);
const rodape = await page.evaluate(() => {
  const img = document.querySelector("[data-rodape-marca]");
  const r = img.getBoundingClientRect();
  return {
    src: img.getAttribute("src"),
    largura: Math.round(r.width),
    op: +getComputedStyle(img).opacity,
    natural: img.naturalWidth,
  };
});
checar("usa o asset logo-footer", rodape.src.includes("logo-footer"), rodape.src);
checar("carregou de fato", rodape.natural > 0, `${rodape.natural}px de largura natural`);
checar("é o grande elemento", rodape.largura > 380, `${rodape.largura}px na tela`);
checar("chegou aceso", rodape.op > 0.85, `opacidade ${rodape.op.toFixed(2)}`);

/* ═══ 14 · Overflow horizontal ════════════════════════════════════════════ */
log("\n── Overflow ──");
for (const [w, h] of [
  [1920, 1080],
  [1440, 900],
  [1024, 768],
  [768, 1024],
  [390, 844],
]) {
  await page.setViewport({ width: w, height: h });
  await sleep(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(800);
  const extra = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  checar(`sem rolagem lateral em ${w}px`, extra <= 1, `${extra}px de excesso`);
}

/* ═══ 15 · Menu mobile ════════════════════════════════════════════════════ */
log("\n── Menu mobile ──");
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await sleep(1200);
await page.evaluate(() => window.scrollTo(0, window.innerHeight * 3));
await sleep(1200);
const botaoMenu = await page.$(".nav__menu, [data-menu-toggle], .nav__burger");
checar("existe botão de menu", Boolean(botaoMenu));
if (botaoMenu) {
  await botaoMenu.click();
  await sleep(900);
  const aberto = await page.evaluate(() => {
    const m = document.querySelector(".menu");
    if (!m) return null;
    const cs = getComputedStyle(m);
    return {
      vis: cs.visibility,
      op: +cs.opacity,
      links: m.querySelectorAll("a").length,
    };
  });
  checar("o painel abre", aberto && aberto.vis === "visible" && aberto.op > 0.8, JSON.stringify(aberto));
  checar("com os links da navegação", aberto && aberto.links >= 4, `${aberto?.links} links`);
  await page.keyboard.press("Escape");
  await sleep(1600);
  const fechado = await page.evaluate(
    () => getComputedStyle(document.querySelector(".menu")).visibility
  );
  checar("fecha no Escape", fechado === "hidden", fechado);
}

/* ═══ 16 · Higiene ════════════════════════════════════════════════════════ */
log("\n── Higiene ──");
await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
await sleep(1000);
const orfaos = await page.evaluate(() => {
  const alvos = [...document.querySelectorAll("*")].filter((e) => {
    const wc = getComputedStyle(e).willChange;
    return wc && wc !== "auto";
  });
  return alvos.length;
});
checar(
  "poucos `will-change` permanentes",
  orfaos <= 40,
  `${orfaos} elementos (GSAP promove sozinho durante a tween)`
);

const relPeso = await page.evaluate(() =>
  performance
    .getEntriesByType("resource")
    .filter((r) => r.name.includes("/videos/") || r.name.includes("/media/"))
    .reduce((s, r) => s + (r.transferSize || 0), 0)
);
log(`  info  mídia transferida até aqui: ${(relPeso / 1048576).toFixed(1)} MB`);

/* FPS durante uma rolagem contínua — é o único jeito de medir o custo real
   das seções presas, do shader e do WebGL rodando juntos. */
await page.evaluate(() => window.scrollTo(0, 0));
await sleep(800);
const fps = await page.evaluate(async () => {
  const quadros = [];
  let anterior = performance.now();
  let parar = false;
  const laco = (t) => {
    quadros.push(t - anterior);
    anterior = t;
    if (!parar) requestAnimationFrame(laco);
  };
  requestAnimationFrame(laco);

  const alt = document.documentElement.scrollHeight - window.innerHeight;
  const inicio = performance.now();
  while (performance.now() - inicio < 6000) {
    const p = (performance.now() - inicio) / 6000;
    window.scrollTo(0, alt * p);
    await new Promise((r) => setTimeout(r, 16));
  }
  parar = true;

  quadros.sort((a, b) => a - b);
  const mediana = quadros[Math.floor(quadros.length / 2)] || 16;
  const p95 = quadros[Math.floor(quadros.length * 0.95)] || 16;
  return { mediana: 1000 / mediana, p95ms: p95, n: quadros.length };
});
checar(
  "fluidez na rolagem",
  fps.mediana > 45,
  `${fps.mediana.toFixed(0)} fps mediano, pior quadro típico ${fps.p95ms.toFixed(0)} ms`
);

await page.screenshot({ path: `${OUT}/final.png` });

/* ═══ 17 · Reduced motion preserva o conteúdo ═════════════════════════════ */
log("\n── Reduced motion ──");
const pagina2 = await browser.newPage();
await pagina2.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await pagina2.setViewport({ width: 1440, height: 900 });
const erros2 = [];
pagina2.on("pageerror", (e) => erros2.push(e.message));
await pagina2.goto(URL, { waitUntil: "networkidle2" });
await sleep(2500);

let escondidos = 0;
for (const id of [
  "manifesto",
  "servicos",
  "social",
  "web",
  "design",
  "branding",
  "estrategia",
  "metodo",
  "porque",
  "clientes",
  "contato",
]) {
  await pagina2.evaluate((s) => {
    const el = document.getElementById(s);
    if (el) el.scrollIntoView();
  }, id);
  await sleep(500);
  escondidos += await pagina2.evaluate((s) => {
    const sec = document.getElementById(s);
    if (!sec) return 0;
    return [...sec.querySelectorAll("h2,h3,p,li,figure,.cartaz,.peca,[data-maquina-etapa]")].filter(
      (e) => {
        const cs = getComputedStyle(e);
        return cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.08;
      }
    ).length;
  }, id);
}
checar("nada some no caminho reduzido", escondidos === 0, `${escondidos} elementos escondidos`);
checar("sem erros no caminho reduzido", erros2.length === 0, erros2.join(" | "));
await pagina2.close();

/* ═══ Console e rede ══════════════════════════════════════════════════════ */
log("\n── Console e rede ──");
checar("console limpo", erros.length === 0, erros.slice(0, 3).join(" | "));
checar("sem respostas 4xx/5xx", ruins.length === 0, ruins.slice(0, 3).join(" | "));

log(`\n═══ ${passou} OK · ${falhou} FALHAS ═══`);
if (falhas.length) {
  log("\nFalhas:");
  falhas.forEach((f) => log(`  · ${f}`));
}

await browser.close();
process.exit(falhou ? 1 : 0);
