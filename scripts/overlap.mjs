/**
 * Caçador de sobreposição de texto.
 *
 *   node scripts/overlap.mjs [url] [largura] [altura]
 *
 * Percorre a página parando em cada seção e procura pares de elementos de
 * TEXTO cujas caixas se cruzam. Existe porque "tem texto em cima de texto" é
 * uma reclamação que se resolve olhando — e olhar vinte telas em cinco
 * larguras não é trabalho para os olhos de ninguém.
 *
 * O que ele NÃO acusa, de propósito:
 *   · ancestral e descendente (um <p> sempre contém as próprias linhas);
 *   · elementos invisíveis (opacidade quase zero, fora do recorte);
 *   · quem está empilhado ATRÁS por decisão de composição — marcado com
 *     `data-sobrepoe` no elemento.
 */
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:5402/";
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);
/* `--reduce` varre o caminho de movimento reduzido.
   É onde mora a pior classe de sobreposição deste site: grupos que se
   revezam por opacidade e estão todos no mesmo ponto. Com animação, um por
   vez; sem ela, todos ao mesmo tempo, um em cima do outro. Sem esta opção o
   defeito ficava invisível para o teste e visível para o leitor. */
const REDUZIDO = process.argv.includes("--reduce");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});

const page = await browser.newPage();
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: REDUZIDO ? "reduce" : "no-preference" },
]);
await page.setViewport({ width: W, height: H });
await page.goto(URL, { waitUntil: "networkidle2" });
await sleep(2500);

const SECOES = [
  "manifesto",
  "servicos",
  "social",
  "web",
  "design",
  "branding",
  "estrategia",
  "metodo",
  "porque",
  "retrato",
  "clientes",
  "contato",
];

/** Procura pares de texto que se cruzam no que está visível AGORA. */
const procurar = () =>
  page.evaluate(() => {
    const TEXTO = "h1,h2,h3,p,li,span,figcaption,b,i,em,strong,a,button";
    /* Camadas FIXAS não contam: barra, rodapé revelado, botão flutuante e
       cursor cobrem o conteúdo por desenho, não por defeito. */
    const FIXAS = ".nav, .menu, .footer, .zap, .cursor, .fio, .progresso, .preloader";

    const vis = [...document.querySelectorAll(TEXTO)].filter((e) => {
      if (e.closest(FIXAS)) return false;
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.15) return false;
      if (e.closest("[aria-hidden='true']")) return false;
      const r = e.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return false;
      if (r.bottom < 0 || r.top > window.innerHeight) return false;

      const proprio = [...e.childNodes]
        .filter((n) => n.nodeType === 3)
        .map((n) => n.textContent.trim())
        .join("");
      if (proprio.length < 3) return false;

      /* O TESTE QUE IMPORTA: o elemento é atingido no próprio centro?
         Uma caixa com `overflow: hidden` e altura zero continua devolvendo
         retângulo para os filhos — texto recolhido de acordeão, painel
         fechado por clip-path, tudo isso aparecia como "sobreposição" sem
         nunca ter sido pintado. Quem não recebe o próprio ponteiro no meio
         não está na tela. */
      const cx = Math.min(Math.max(r.left + r.width / 2, 1), window.innerWidth - 1);
      const cy = Math.min(Math.max(r.top + r.height / 2, 1), window.innerHeight - 1);
      const alvo = document.elementFromPoint(cx, cy);
      if (!alvo) return false;
      if (alvo !== e && !e.contains(alvo) && !alvo.contains(e)) return false;
      return true;
    });

    const cruza = (a, b) =>
      a.left < b.right - 3 && b.left < a.right - 3 && a.top < b.bottom - 3 && b.top < a.bottom - 3;

    const achados = [];
    for (let i = 0; i < vis.length; i++) {
      for (let j = i + 1; j < vis.length; j++) {
        const A = vis[i];
        const B = vis[j];
        if (A.contains(B) || B.contains(A)) continue;
        // Composições que se sobrepõem de propósito ficam de fora.
        if (A.closest("[data-sobrepoe]") || B.closest("[data-sobrepoe]")) continue;
        const ra = A.getBoundingClientRect();
        const rb = B.getBoundingClientRect();
        if (!cruza(ra, rb)) continue;
        const marca = (e) =>
          (e.tagName + "." + String(e.className || "").split(" ")[0]).slice(0, 38);
        achados.push(
          `${marca(A)} × ${marca(B)}  «${A.textContent.trim().slice(0, 22)}» × «${B.textContent
            .trim()
            .slice(0, 22)}»`
        );
      }
    }
    return [...new Set(achados)];
  });

let total = 0;
for (const id of SECOES) {
  const g = await page.evaluate((sid) => {
    const el = document.getElementById(sid);
    const sp = el.closest(".pin-spacer") || el;
    return { topo: window.scrollY + sp.getBoundingClientRect().top, alt: sp.offsetHeight };
  }, id);

  /* Três pontos por seção: uma seção presa muda de composição do começo ao
     fim, e o encavalamento costuma aparecer só num dos estados. */
  for (const f of [0.15, 0.5, 0.85]) {
    await page.evaluate((y) => window.scrollTo(0, y), g.topo + g.alt * f);
    await sleep(1500);
    const achados = await procurar();
    if (achados.length) {
      console.log(`\n${id} @ ${Math.round(f * 100)}%`);
      achados.slice(0, 8).forEach((a) => console.log("   " + a));
      total += achados.length;
    }
  }
}

const modo = REDUZIDO ? " (movimento reduzido)" : "";
console.log(
  total ? `\n${total} sobreposições${modo}` : `\nnenhuma sobreposição de texto${modo}`
);
await browser.close();
process.exit(total ? 1 : 0);
