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

/**
 * Rola a página do jeito que o site entende.
 *
 * `window.scrollTo` cru BRIGA com o scroll suavizado: o Lenis guarda um alvo
 * próprio e, no quadro seguinte, arrasta a página de volta para ele. O teste
 * media a posição certa, o Lenis desfazia, e a leitura saía de um ponto
 * centenas de pixels adiante — o que fazia uma pose correta parecer errada.
 *
 * Dirigir pelo Lenis, com `immediate`, é também o que se aproxima de um
 * usuário: é a mesma porta que os links de âncora do site usam.
 */
async function rolarPara(page, y) {
  await page.evaluate((destino) => {
    const l = window.__lenis;
    if (l) l.scrollTo(destino, { immediate: true, force: true });
    else window.scrollTo(0, destino);
  }, Math.max(0, Math.round(y)));
}

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
    await rolarPara(page, await page.evaluate(() => window.scrollY) + delta);
    await sleep(espera);
  }
  await sleep(600);
}

/** Rola para uma fração do documento. */
async function fracao(page, f, espera = 1200) {
  const alt = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight
  );
  await rolarPara(page, alt * f);
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
const doInstagram = (t) =>
  /instagram|ErrorUtils|allow-same-origin|fburl.com/i.test(t);
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const t = m.text();
  /* O embed do Instagram vive numa caixa de areia sem `allow-same-origin` e o
     script deles reclama de cookie. É erro de outra origem, dentro de um
     frame que não controlamos: contá-lo como nosso esconderia os nossos. */
  if (doInstagram(t)) return;
  erros.push(t);
});
page.on("pageerror", (e) => erros.push(`pageerror: ${e.message}`));
page.on("response", (r) => r.status() >= 400 && ruins.push(`${r.status()} ${r.url()}`));

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
/* `?laptop=debug` liga a sonda de colocação — a caixa do objeto em pixels
   de tela. Ela não existe em produção (custa uma projeção por quadro), e sem
   ela o pouso só poderia ser verificado por uma pose nominal, que é
   exatamente a asserção que envelhece junto com o desenho.
   O parâmetro NÃO troca os materiais: só o valor `debug` faz isso, e aqui a
   página é carregada normal. */
await page.goto(URL + (URL.includes("?") ? "&" : "?") + "laptop=medir", { waitUntil: "networkidle2" });
await sleep(3000);

/* ═══ 1 · O caminho do notebook ═══════════════════════════════════════════
   A exigência do briefing é literal: "o laptop não pode teletransportar".
   Isso é verificável — amostra-se a pose ao longo da página e confere-se que
   ela chega em cada parada prevista e que nenhum salto é grande demais para
   ter sido percorrido à vista. */
log("\n── Caminho do notebook ──");

/* As paradas são LIDAS DO CONTEÚDO, não copiadas para cá.
   A versão anterior repetia as coordenadas à mão, e o resultado foi o
   previsível: a coreografia mudou e o teste passou a reprovar o desenho novo
   por não ser o desenho velho — quatro falhas que não descreviam defeito
   nenhum. O que este teste tem de garantir não é uma coordenada específica; é
   que a pose PROMETIDA por `story.js` seja a pose ENTREGUE na tela, o que
   continua pegando teletransporte, gatilho invertido e trecho que não escreve.

   O manifesto fica de fora: no topo dele o NASCIMENTO ainda está acontecendo,
   e a pose alvo por definição só chega depois. O fecho também: a pose dele
   deixou de ser um par de números e virou um encaixe entre o botão e o
   rodapé, medido em pixels lá embaixo. */
const { sections: SECOES_CONTEUDO } = await import("../src/content/story.js");
const PARADAS = SECOES_CONTEUDO.filter(
  (s) => s.laptop && !["manifesto", "contato"].includes(s.id)
).map((s) => [s.id, s.laptop.x, s.laptop.y]);

/* O NASCIMENTO. O objeto não pode existir durante a hero — é o pedido
   explícito — e tem de nascer CRESCENDO, não aparecendo pronto. */
const noTopo = await lerCena(page);
checar(
  "ausente durante a hero",
  noTopo && noTopo.presenca < 0.02,
  "presenca " + noTopo?.presenca?.toFixed(2)
);

const nascimento = [];
for (let i = 0; i <= 26; i++) {
  await fracao(page, (i / 26) * 0.16, 150);
  const c = await lerCena(page);
  if (c) nascimento.push({ x: c.x, z: c.z, s: c.scale, p: c.presenca });
}

/* A ENTRADA é um movimento, não uma opacidade.
   O critério antigo — "houve quadro pequeno e semitransparente" — descrevia
   um nascimento que crescia no centro. Ele foi trocado por uma entrada: o
   objeto começa meio fora do quadro pela direita, longe da câmera e de
   costas, e a viagem inteira é a revelação. Então o que se verifica agora é
   que ele ESTEVE lá fora e no fundo enquanto ainda era parcialmente visível,
   e que percorreu uma distância de verdade até a primeira pose. */
checar(
  "entra de fora do quadro, e nao aparece no lugar",
  nascimento.some((n) => n.p > 0.04 && n.p < 0.95 && n.x > 0.85 && n.z < -1),
  "houve quadro parcial com o objeto ainda fora do quadro e no fundo"
);
const percursoEntrada = Math.max(...nascimento.map((n) => n.x)) - Math.min(...nascimento.map((n) => n.x));
checar(
  "e a entrada atravessa a composicao",
  percursoEntrada > 1.2,
  percursoEntrada.toFixed(2) + " de percurso horizontal"
);

/** Posiciona a seção no ponto em que a viagem termina e a deriva começa. */
async function irParaChegada(page, id) {
  for (let i = 0; i < 5; i++) {
    const delta = await page.evaluate((sid) => {
      const el = document.getElementById(sid);
      const sp = el.closest(".pin-spacer") || el;
      /* 62% da janela: é exatamente o `end` da tween de chegada e o `start`
         do gatilho de deriva. Ali a viagem terminou e a deriva ainda vale
         zero — o único instante em que a pose é a nominal. */
      return sp.getBoundingClientRect().top - window.innerHeight * 0.62;
    }, id);
    if (Math.abs(delta) < 6) break;
    await rolarPara(page, (await page.evaluate(() => window.scrollY)) + delta);
    await sleep(1000);
  }
  await sleep(900);
}

const trajeto = [];
for (const [id, ax, ay] of PARADAS) {
  await irParaChegada(page, id);
  const pose = await lerCena(page);
  if (!pose) {
    checar(`pose em ${id}`, false, "sonda window.__cena ausente");
    continue;
  }
  trajeto.push({ id, ...pose });
  /* Tolerância apertada, porque a medição é feita no ponto exato em que a
     viagem termina: ali a deriva ainda é zero e a pose tem de ser a nominal.
     A folga que sobra é só o atraso do `scrub`. */
  const perto = Math.abs(pose.x - ax) < 0.1 && Math.abs(pose.y - ay) < 0.1;
  checar(`pose alvo em ${id}`, perto, `x=${pose.x.toFixed(2)} y=${pose.y.toFixed(2)}`);
}

/* Continuidade: amostragem densa e nenhum salto brusco entre amostras
   vizinhas. Um "teletransporte" apareceria aqui como um degrau. */
const amostras = [];
for (let i = 0; i <= 80; i++) {
  await fracao(page, 0.1 + (i / 80) * 0.88, 130);
  const p = await lerCena(page);
  if (p) amostras.push(p.x);
}
let maiorSalto = 0;
for (let i = 1; i < amostras.length; i++) {
  maiorSalto = Math.max(maiorSalto, Math.abs(amostras[i] - amostras[i - 1]));
}
checar(
  "trajeto sem degrau",
  /* O limite é a maior transição do roteiro (o retorno ao centro no fecho,
     1,46 de largura). Um teletransporte — que é o que este teste existe para
     pegar — apareceria como um salto de três ou mais numa amostra só. */
  amostras.length > 60 && maiorSalto < 1.5,
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

/* ═══ 2b · Ausencia e fechamento ══════════════════════════════════════════
   O fio condutor precisa de PAUSA, e o ultimo gesto e a tampa descendo. */
log("\n── Ausência e tampa ──");
const meioDaSecao = async (id) => {
  const g = await page.evaluate((sid) => {
    const el = document.getElementById(sid);
    const sp = el.closest(".pin-spacer") || el;
    return { topo: window.scrollY + sp.getBoundingClientRect().top, alt: sp.offsetHeight };
  }, id);
  await rolarPara(page, g.topo + g.alt * 0.5);
  await sleep(1500);
};

const ausencias = {};
for (const id of ["branding", "porque", "estrategia", "contato"]) {
  await meioDaSecao(id);
  const c = await lerCena(page);
  ausencias[id] = c ? { p: +c.presenca.toFixed(2), faixa: c.secao } : null;
}
const presencaEm = (id) => ausencias[id]?.p;
checar(
  "o notebook sai de cena onde a secao tem palco proprio",
  presencaEm("branding") === 0 && presencaEm("porque") === 0,
  JSON.stringify(ausencias)
);
checar(
  "e volta depois",
  presencaEm("estrategia") === 1 && presencaEm("contato") === 1,
  JSON.stringify(ausencias)
);

await rolarPara(page, await page.evaluate(() => document.documentElement.scrollHeight));
await sleep(2400);
const fimCena = await lerCena(page);

/* ── O POUSO ──────────────────────────────────────────────────────────────
   O último quadro da narrativa tem um contrato explícito: o notebook para
   de frente, centrado, ABAIXO do botão e ACIMA do rodapé, com a tela aberta
   e o vídeo rodando.

   Cada uma dessas cinco coisas já esteve errada em algum momento — o giro
   contínuo deixava o objeto a 63° de perfil; a função de pose no ticker
   apagava a aproximação escrita por uma tween; o `sticky` da camada 3D era
   empurrado 190px para cima pela revelação do rodapé e punha o objeto em
   cima do botão; a tampa fechava justamente sobre o vídeo. Nenhuma dessas
   falhas aparece lendo o código, e nenhuma delas aparece numa asserção sobre
   a pose: todas aparecem em pixels. */
const pouso = await page.evaluate(() => {
  const btn = document.querySelector('[data-sec="contato"] .btn');
  const rod = document.querySelector(".footer");
  const cv = document.querySelector(".story__laptop canvas");
  if (!btn || !rod || !cv || !window.__pos) return null;
  const px = window.__pos()?.telaPx;
  if (!px) return null;
  return {
    botao: Math.round(btn.getBoundingClientRect().bottom),
    rodape: Math.round(rod.getBoundingClientRect().top),
    canvasTopo: Math.round(cv.getBoundingClientRect().top),
    ...px,
  };
});

if (!pouso) {
  checar("pouso mensurável no fecho", false, "sonda window.__pos ausente (falta ?laptop=debug)");
} else {
  checar(
    "a camada 3D nao e arrastada pela revelacao do rodape",
    Math.abs(pouso.canvasTopo) < 4,
    "topo do canvas " + pouso.canvasTopo + "px"
  );
  checar("o notebook pousa ABAIXO do botao", pouso.topo > pouso.botao, `botao ${pouso.botao} · notebook ${pouso.topo}`);
  checar("e ACIMA do rodape", pouso.base < pouso.rodape, `notebook ${pouso.base} · rodape ${pouso.rodape}`);
  checar(
    "centrado no eixo do botao",
    Math.abs((pouso.esq + pouso.dir) / 2 - 720) < 40,
    "centro " + Math.round((pouso.esq + pouso.dir) / 2)
  );
  checar(
    "e grande o bastante para o video ser assunto",
    pouso.base - pouso.topo > 200,
    pouso.base - pouso.topo + "px de altura"
  );
}

checar("a tela fica ABERTA no fecho", fimCena && fimCena.tampa < 0.05, "tampa " + fimCena?.tampa?.toFixed(2));
checar("de frente para o leitor", fimCena && Math.abs(fimCena.rotY) < 0.06, "rotY " + fimCena?.rotY?.toFixed(3));
checar("e parado", fimCena && fimCena.pouso > 0.98, "pouso " + fimCena?.pouso?.toFixed(2));
checar("e o objeto volta ao centro", fimCena && Math.abs(fimCena.x) < 0.05, "x " + fimCena?.x);

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
  await rolarPara(page, secSocial.topo + secSocial.alt * f);
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
  "as nove peças formam a grade três por três",
  gradeFeed.n === 9 && gradeFeed.linhas === 3,
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
  await rolarPara(page, secWeb.topo + secWeb.alt * f);
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

await rolarPara(page, secWeb.topo + secWeb.alt + 400);
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
await rolarPara(page, secDesign.topo + secDesign.alt * 0.75);
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
  await rolarPara(page, secBrand.topo + secBrand.alt * f);
  await sleep(1300);
  desenho.push(
    await page.evaluate(() => {
      const t = document.querySelector("[data-bd-traco]");
      /* O DrawSVG desenha encolhendo o PRIMEIRO valor do dash-array: ele vai
         de 0 ao comprimento do traço. O dash-offset fica praticamente parado
         em zero — medi-lo não diz nada sobre o progresso. */
      const arr = t ? parseFloat(getComputedStyle(t).strokeDasharray) || 0 : -1;
      const marca = document.querySelector("[data-bd-marca]");
      const cp = marca ? getComputedStyle(marca).clipPath : "";
      const pc = /circle\(([\d.]+)/.exec(cp);
      return { arr: Math.round(arr), revelada: pc ? Number(pc[1]) : -1 };
    })
  );
}
checar(
  "o símbolo é traçado pelo scroll",
  desenho[2].arr > desenho[0].arr + 100,
  `comprimento desenhado ${desenho.map((d) => d.arr).join(" → ")}px`
);
checar(
  "a marca real é revelada",
  desenho[2].revelada > 40,
  `clip-path em ${desenho[2].revelada}% ao fim da construção`
);
checar(
  "é a arte do projeto, não um símbolo inventado",
  await page.evaluate(() => {
    const img = document.querySelector("[data-bd-marca] img");
    return Boolean(img && img.naturalWidth > 0 && img.getAttribute("src").includes("logo"));
  }),
  "logo-mark.png carregada"
);

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
await rolarPara(page, secEst.topo + secEst.alt * 0.6);
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
  await rolarPara(page, secMaq.topo + secMaq.alt * f);
  await sleep(1500);
  const idx = await page.evaluate(() =>
    [...document.querySelectorAll("[data-maquina-etapa]")].findIndex(
      (el) => +getComputedStyle(el).opacity > 0.7
    )
  );
  if (idx >= 0) etapasVistas.add(idx);
}
checar("as etapas se revezam", etapasVistas.size >= 3, `etapas vistas: ${[...etapasVistas].join(",")}`);

/* As pecas precisam PERCORRER a esteira, nao aparecer nas pontas. Mede-se a
   posicao das mesmas fichas em dois momentos: se elas nao andaram, a esteira
   e decoracao. */
await rolarPara(page, secMaq.topo + secMaq.alt * 0.12);
await sleep(1600);
const fichasAntes = await page.evaluate(() =>
  [...document.querySelectorAll("[data-maquina-ficha]")].map((e) =>
    Math.round(e.getBoundingClientRect().left)
  )
);
await rolarPara(page, secMaq.topo + secMaq.alt * 0.46);
await sleep(1800);
const fichasDepois = await page.evaluate(() =>
  [...document.querySelectorAll("[data-maquina-ficha]")].map((e) =>
    Math.round(e.getBoundingClientRect().left)
  )
);
const andaram = fichasAntes.filter((v, i) => Math.abs(v - fichasDepois[i]) > 120).length;
checar(
  "as informacoes percorrem a esteira",
  andaram >= 3,
  andaram + "/4 fichas se deslocaram mais de 120px"
);

await rolarPara(page, secMaq.topo + secMaq.alt * 0.9);
await sleep(1700);
const saidas = await page.evaluate(() => {
  const els = [...document.querySelectorAll("[data-maquina-saida]")];
  const visiveis = els.filter((e) => +getComputedStyle(e).opacity > 0.6);
  const xs = visiveis.map((e) => Math.round(e.getBoundingClientRect().left));
  return { n: visiveis.length, distintos: new Set(xs).size };
});
checar("as sete entregas saem", saidas.n === 7, saidas.n + "/7 visiveis");
checar(
  "e saem em comboio, nao empilhadas",
  saidas.distintos >= 5,
  saidas.distintos + " posicoes distintas"
);

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
checar("o eixo aparece só em DIREÇÃO", eixo > 0.8, "opacidade " + eixo);

/* O CAMPO MAGNETICO: a composicao responde ao cursor mesmo parada. */
const caixaPalco = await page.evaluate(() => {
  const r = document.querySelector("[data-palco]").getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
});
const lerPecas = () =>
  page.evaluate(() =>
    [...document.querySelectorAll("[data-palco-peca]")]
      .map((e) => {
        const r = e.getBoundingClientRect();
        return Math.round(r.left) + "," + Math.round(r.top);
      })
      .join("|")
  );
await page.mouse.move(caixaPalco.x + caixaPalco.w * 0.85, caixaPalco.y + caixaPalco.h * 0.15);
await sleep(1300);
const campoA = await lerPecas();
await page.mouse.move(caixaPalco.x + caixaPalco.w * 0.2, caixaPalco.y + caixaPalco.h * 0.7);
await sleep(1400);
const campoB = await lerPecas();
checar("o campo responde ao cursor", campoA !== campoB, "as pecas se deslocam com o ponteiro");

/* ═══ 11 · Clientes ═══════════════════════════════════════════════════════ */
log("\n── Clientes ──");
await irPara(page, "clientes");
const arranjo = await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".marca__gatilho")].map((e) =>
    e.getBoundingClientRect()
  );
  if (cards.length < 2) return null;
  /* Arco: uma marca embaixo a esquerda, outra em cima a direita. Se as duas
     estiverem na mesma faixa, a composicao virou grade de novo. */
  return {
    n: cards.length,
    desnivel: Math.round(Math.abs(cards[0].top - cards[1].top)),
    esquerdaPrimeiro: cards[0].left < cards[1].left,
  };
});
checar(
  "as marcas formam um arco, nao uma fileira",
  arranjo && arranjo.n === 2 && arranjo.desnivel > 90 && arranjo.esquerdaPrimeiro,
  JSON.stringify(arranjo)
);

const arcoTracado = await page.evaluate(() => {
  const p = document.querySelector("[data-quem-arco]");
  return Math.round(parseFloat(getComputedStyle(p).strokeDasharray) || 0);
});
checar("o arco e desenhado pelo scroll", arcoTracado > 300, arcoTracado + "px tracados");

/* O painel abre DENTRO da composicao — nao como modal por cima da pagina. */
const alvoMarca = await page.evaluate(() => {
  const m = document.querySelector('[data-marca="real-pisos"] .marca__gatilho');
  const r = m.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
/* Tira o ponteiro de cima da composição antes de medir o estado de repouso:
   o hover é o gatilho, e o cursor pode ter ficado ali da checagem anterior. */
await page.mouse.move(4, 4);
await sleep(900);
const painelFechado = await page.evaluate(
  () => +getComputedStyle(document.querySelector("[data-quem-perfil]")).opacity
);
checar("o painel nasce fechado", painelFechado < 0.05, "opacidade " + painelFechado);

await page.mouse.move(alvoMarca.x, alvoMarca.y);
await sleep(1400);
const painelAberto = await page.evaluate(() => {
  const el = document.querySelector("[data-quem-perfil]");
  const palco = document.querySelector("[data-quem-palco]");
  const r = el.getBoundingClientRect();
  const pr = palco.getBoundingClientRect();
  const frame = el.querySelector("iframe");
  return {
    op: +getComputedStyle(el).opacity,
    dentroDoPalco: r.top >= pr.top - 8 && r.bottom <= pr.bottom + 8 && r.left >= pr.left - 8,
    src: frame?.getAttribute("src") || null,
    link: el.querySelector(".quem__perfil-link")?.href || null,
  };
});
checar("abre ao apontar a marca", painelAberto.op > 0.9, "opacidade " + painelAberto.op);
checar(
  "e abre DENTRO da composicao, nao como modal",
  painelAberto.dentroDoPalco,
  "o painel esta contido no palco da secao"
);
checar(
  "o iframe aponta para o perfil real",
  painelAberto.src && painelAberto.src.includes("instagram.com/realpisos"),
  painelAberto.src
);
checar(
  "e ha saida para o perfil verdadeiro",
  painelAberto.link === "https://www.instagram.com/realpisos/",
  painelAberto.link
);

const outraRecua = await page.evaluate(
  () => +getComputedStyle(document.querySelector('[data-marca="wanderson-carvalho"]')).opacity
);
checar("a outra marca recua", outraRecua < 0.6, "opacidade " + outraRecua);

await sleep(4200);
const embedOk = await page.evaluate(() => !document.querySelector(".quem__perfil-reserva"));
log(
  embedOk
    ? "  info  o embed do Instagram carregou dentro da composicao"
    : "  info  o Instagram recusou o embed nesta execucao; a reserva assumiu"
);

/* ═══ 12 · WhatsApp ═══════════════════════════════════════════════════════ */
log("\n── WhatsApp ──");
await rolarPara(page, 0);
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
checar(
  "é uma assinatura, não um cartaz",
  rodape.largura > 120 && rodape.largura < 320,
  `${rodape.largura}px na tela`
);
const alturaRodape = await page.evaluate(() =>
  Math.round(document.querySelector(".footer").offsetHeight)
);
checar(
  "e o rodapé inteiro é compacto",
  alturaRodape < 260,
  `${alturaRodape}px de altura`
);
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
  await rolarPara(page, 0);
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
await rolarPara(page, await page.evaluate(() => window.innerHeight * 3));
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
  await sleep(1200);
  /* Mede se o painel saiu da RENDERIZAÇÃO, e não a `visibility`:
     `display: none` não muda `visibility`, então a asserção antiga acusava
     "aberto" mesmo com o menu fora da árvore. O que interessa é justamente
     isto — com o menu fechado, os cinco links não podem receber Tab nem ser
     lidos por leitor de tela. */
  const fechado = await page.evaluate(() => {
    const m = document.querySelector(".menu");
    const link = m.querySelector("a");
    return {
      display: getComputedStyle(m).display,
      renderizado: Boolean(m.offsetParent) || m.getClientRects().length > 0,
      linkAlcancavel: Boolean(link && link.getClientRects().length),
    };
  });
  checar(
    "fecha no Escape e sai da árvore",
    fechado.display === "none" && !fechado.renderizado && !fechado.linkAlcancavel,
    JSON.stringify(fechado)
  );
}

/* ═══ 15b · Indicador da navbar ══════════════════════════════════════════ */
log("\n── Navbar ──");
await page.setViewport({ width: 1440, height: 900, isMobile: false, hasTouch: false });
await sleep(900);
const marcados = [];
for (const id of ["web", "metodo", "clientes"]) {
  await irPara(page, id);
  marcados.push(
    await page.evaluate(() => {
      const li = document.querySelector('.nav__links li[data-ativo="true"]');
      const m = document.querySelector(".nav__marcador");
      return {
        item: li ? li.dataset.navItem : null,
        dentro: Boolean(li && m && li.contains(m)),
        op: m ? +getComputedStyle(m).opacity : 0,
      };
    })
  );
}
checar(
  "a barra marca a secao em cena",
  marcados.filter((m) => m.item).length >= 2,
  marcados.map((m) => m.item).join(" -> ")
);
checar(
  "e o marcador viaja ate o item ativo",
  marcados.some((m) => m.dentro && m.op > 0.8),
  JSON.stringify(marcados[marcados.length - 1])
);

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
await rolarPara(page, 0);
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

/* O NOTEBOOK TAMBÉM ANDA NO CAMINHO REDUZIDO.

   Este teste existe por um relato: "o laptop não está mexendo, está parado no
   canto inferior direito". Era verdade, e nenhuma das outras 78 asserções
   pegava — todas rodam com movimento normal. No modo reduzido a pose era
   FIXADA uma vez, num canto, e ficava lá a página inteira.

   Movimento reduzido pede que a página não se mexa sozinha; não pede que um
   objeto do tamanho de meia tela fique encalhado num canto enquanto se rola.
   O trajeto continua preso ao scroll — o que sai são os floreios autônomos. */
const posesReduzidas = [];
for (const id of ["social", "web", "metodo", "contato"]) {
  await pagina2.evaluate((sid) => {
    const el = document.getElementById(sid);
    if (el) el.scrollIntoView();
  }, id);
  await sleep(700);
  const c = await pagina2.evaluate(() => (window.__cena ? window.__cena() : null));
  if (c) posesReduzidas.push({ id, x: +c.x.toFixed(2), scale: +c.scale.toFixed(2) });
}
const distintas = new Set(posesReduzidas.map((p) => `${p.x}|${p.scale}`)).size;
checar(
  "o notebook percorre o site tambem com movimento reduzido",
  distintas >= 3,
  JSON.stringify(posesReduzidas)
);
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
