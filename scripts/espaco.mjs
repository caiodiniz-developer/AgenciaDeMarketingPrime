/**
 * Onde há espaço para o notebook, em cada seção.
 *
 *   node scripts/espaco.mjs [largura] [altura]
 *
 * Para cada seção o script varre a janela num grid, marca as células ocupadas
 * por conteúdo — texto, imagens, vídeos, painéis, a barra, o botão flutuante —
 * e devolve o maior retângulo que fica LIVRE.
 *
 * A varredura acontece em TRÊS pontos da faixa (começo, meio, fim) e as três
 * ocupações são somadas. Uma seção presa muda de composição do começo ao fim:
 * o espaço que está livre na chegada pode ser exatamente onde uma ficha vai
 * parar dez por cento depois. O que interessa é o espaço que fica livre
 * durante a seção INTEIRA.
 *
 * Existe porque o briefing é explícito: "não escolha posições arbitrárias,
 * analise o layout". Numa página de onze seções presas, escolher a olho é
 * como o objeto acaba por cima de um parágrafo — e a correção manual por
 * seção envelhece na primeira mudança de layout.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
const URL = process.env.PRIME_URL || "http://localhost:5402/";
const CX = 40;
const CY = 26;

const SECOES = [
  "manifesto", "servicos", "social", "web", "design", "branding",
  "estrategia", "metodo", "porque", "clientes", "contato",
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await page.setViewport({ width: W, height: H });
await page.goto(URL, { waitUntil: "networkidle2" });
await sleep(2500);

/**
 * Ocupação PESADA da janela.
 *
 * Nem tudo que está desenhado disputa o mesmo espaço. Um título e um botão
 * não podem ter nada por cima; uma textura de fundo pode. A primeira versão
 * tratava tudo igual e o resultado saiu inútil — todas as seções empatadas
 * em "ocupada de ponta a ponta", porque os vídeos de fundo cobrem a tela
 * inteira e saturavam o grid sozinhos.
 *
 * Então: peso por papel, e qualquer caixa que cubra mais da metade da janela
 * é fundo por definição e não conta.
 */
const PESOS = [
  [".nav, .zap, button, .btn, a[href]", 4],
  ["h1, h2, h3, h4, [class*=titulo]", 4],
  ["p, li, figcaption, [class*=texto], [class*=body]", 3],
  ["figure, img, [class*=cartao], [class*=cartaz], [class*=ficha], [class*=peca], [class*=painel]", 2],
  ["svg", 1],
];

const ocupacao = (cx, cy) =>
  page.evaluate(
    ([CXi, CYi, pesos]) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const areaJanela = vw * vh;
      const caixas = [];
      for (const [sel, peso] of pesos) {
        for (const e of document.querySelectorAll(sel)) {
          const cs = getComputedStyle(e);
          if (cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.12) continue;
          if (e.closest(".story__scene")) continue;
          const b = e.getBoundingClientRect();
          if (b.width < 6 || b.height < 6) continue;
          if (b.bottom < 0 || b.top > vh || b.right < 0 || b.left > vw) continue;
          /* Maior que meia janela é fundo, não composição. */
          if (b.width * b.height > areaJanela * 0.5) continue;
          caixas.push({ b, peso });
        }
      }
      const cw = vw / CXi;
      const ch = vh / CYi;
      const g = [];
      for (let j = 0; j < CYi; j++) {
        const linha = [];
        for (let i = 0; i < CXi; i++) {
          const x0 = i * cw, y0 = j * ch, x1 = x0 + cw, y1 = y0 + ch;
          let peso = 0;
          for (const { b, peso: w } of caixas) {
            if (b.left - 12 < x1 && b.right + 12 > x0 && b.top - 12 < y1 && b.bottom + 12 > y0) {
              if (w > peso) peso = w;
            }
          }
          linha.push(peso);
        }
        g.push(linha);
      }
      return g;
    },
    [cx, cy, PESOS]
  );

/**
 * O MELHOR LUGAR, que não é o mesmo que o lugar vazio.
 *
 * Exigir um retângulo perfeitamente livre não funciona aqui: numa seção
 * presa o conteúdo entra, se desloca e sai, então a união das ocupações cobre
 * quase tudo e sobra uma tira de 72px na borda. Medido, foi exatamente isso.
 *
 * O objeto também não precisa de vazio absoluto — ele é um elemento de
 * composição, e passar POR TRÁS de um detalhe secundário é aceitável; o que
 * não pode é sentar em cima do título e do parágrafo durante a leitura.
 *
 * Então a pergunta vira outra: deslizando uma janela do tamanho aproximado do
 * notebook por toda a tela, qual posição acumula MENOS conteúdo ao longo da
 * seção inteira? A ocupação é somada nas três amostras, o que dá peso maior a
 * quem está ocupado o tempo todo do que a quem passa por ali uma vez.
 */
function melhorLugar(soma, jw, jh) {
  let melhor = null;
  for (let j = 0; j + jh <= CY; j++) {
    for (let i = 0; i + jw <= CX; i++) {
      let peso = 0;
      for (let b = 0; b < jh; b++) for (let a = 0; a < jw; a++) peso += soma[j + b][i + a];
      /* Empate desfeito pela DISTÂNCIA DA BORDA: entre dois lugares igualmente
         livres, o mais interno é o que faz o objeto participar da composição
         em vez de espiar de fora. */
      const cxJan = i + jw / 2 - CX / 2;
      const escore = peso + Math.abs(cxJan) * 0.35;
      if (!melhor || escore < melhor.escore) melhor = { escore, peso, i, j };
    }
  }
  return melhor;
}

/** Maior retângulo de zeros: histograma por linha + pilha. */
function maiorLivre(g) {
  let melhor = { area: 0 };
  const alt = new Array(CX).fill(0);
  for (let j = 0; j < CY; j++) {
    for (let i = 0; i < CX; i++) alt[i] = g[j][i] ? 0 : alt[i] + 1;
    const pilha = [];
    for (let i = 0; i <= CX; i++) {
      const h = i === CX ? -1 : alt[i];
      while (pilha.length && alt[pilha[pilha.length - 1]] >= h) {
        const topo = pilha.pop();
        const esq = pilha.length ? pilha[pilha.length - 1] + 1 : 0;
        const area = (i - esq) * alt[topo];
        if (area > melhor.area) melhor = { area, i0: esq, i1: i - 1, j0: j - alt[topo] + 1, j1: j };
      }
      pilha.push(i);
    }
  }
  return melhor.area ? melhor : null;
}

console.log(`\njanela ${W}×${H} — espaço livre DURANTE TODA a seção`);
console.log("(x,y em coordenadas de pose: -1 esquerda/baixo, +1 direita/cima)\n");

for (const id of SECOES) {
  const soma = Array.from({ length: CY }, () => new Array(CX).fill(0));
  for (const f of [0.12, 0.5, 0.86]) {
    await page.evaluate(
      ([sid, frac]) => {
        const el = document.getElementById(sid);
        const sp = el.closest(".pin-spacer") || el;
        const topo = window.scrollY + sp.getBoundingClientRect().top;
        window.__lenis.scrollTo(topo + sp.offsetHeight * frac, { immediate: true });
      },
      [id, f]
    );
    await sleep(1300);
    const g = await ocupacao(CX, CY);
    for (let j = 0; j < CY; j++) for (let i = 0; i < CX; i++) soma[j][i] += g[j][i];
  }

  /* A janela tem o tamanho aproximado do notebook num momento de destaque:
     pouco mais de um terço da largura e quase metade da altura. */
  const JW = Math.round(CX * 0.34);
  const JH = Math.round(CY * 0.44);
  const m = melhorLugar(soma, JW, JH);
  const cw = W / CX, ch = H / CY;
  const px = (m.i + JW / 2) * cw;
  const py = (m.j + JH / 2) * ch;
  const celulas = JW * JH * 3 * 4;
  console.log(
    `  ${id.padEnd(11)} x ${String((((px - W / 2) / (W / 2))).toFixed(2)).padStart(5)}` +
      `  y ${String(((-(py - H / 2) / (H / 2))).toFixed(2)).padStart(5)}` +
      `   disputa ${String(Math.round((m.peso / celulas) * 100)).padStart(3)}%` +
      `   ${m.peso === 0 ? "(livre)" : ""}`
  );
}

await browser.close();
