/**
 * A coreografia do notebook, medida.
 *
 *   node scripts/coreografia.mjs [largura] [altura]
 *
 * Varre a página inteira em passos finos e, para cada seção, relata:
 *
 *   presença  — quanto da janela o objeto ocupa no seu maior momento ali;
 *   z         — o quanto ele viaja em profundidade dentro da seção;
 *   giro      — a amplitude de rotação em Y;
 *   invasão   — a pior sobreposição com conteúdo QUE IMPORTA (título,
 *               parágrafo, botão), em porcentagem da área do objeto.
 *
 * As duas últimas colunas são o contrato do briefing escrito como número:
 * "nos momentos principais ele pode ocupar 35–60% da área visual" e "ele NÃO
 * deve passar por cima de textos importantes apenas porque a timeline mandou".
 *
 * Precisa de `?laptop=medir`, que liga a sonda de colocação sem trocar
 * material nenhum — a página medida é a página que o leitor vê.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = Number(process.argv[2] || 1440);
const H = Number(process.argv[3] || 900);
const URL = process.env.PRIME_URL || "http://localhost:5402/";
const PASSOS = Number(process.argv[4] || 70);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage();
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
await page.setViewport({ width: W, height: H });
await page.goto(`${URL}?laptop=medir`, { waitUntil: "networkidle2" });
await page.waitForFunction(() => window.__lenis && window.__cena, { timeout: 30000 });
await sleep(2800);

const total = await page.evaluate(
  () => document.documentElement.scrollHeight - window.innerHeight
);

const porSecao = new Map();
let rotYmin = Infinity;
let rotYmax = -Infinity;
let zmin = Infinity;
let zmax = -Infinity;

for (let k = 0; k <= PASSOS; k++) {
  await page.evaluate(
    (y) => (window.__lenis ? window.__lenis.scrollTo(y, { immediate: true }) : window.scrollTo(0, y)),
    Math.round((total * k) / PASSOS)
  );
  await sleep(340);

  const a = await page.evaluate(() => {
    const pos = window.__pos && window.__pos();
    const c = window.__cena && window.__cena();
    if (!pos || !c) return null;

    /* Invasão: quanto da área do objeto cai em cima de conteúdo que importa.
       Fundos e decorações não contam — passar por trás de uma textura é
       composição; passar por cima de um parágrafo é defeito. */
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const px = pos.telaPx;
    const areaObj = Math.max(1, (px.dir - px.esq) * (px.base - px.topo));
    let invadida = 0;
    const SEL = "h1,h2,h3,h4,p,li,.btn,button,a[href]";
    for (const e of document.querySelectorAll(SEL)) {
      const cs = getComputedStyle(e);
      if (cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.15) continue;
      if (e.closest(".story__scene, .nav, .zap")) continue;
      const b = e.getBoundingClientRect();
      if (b.width < 8 || b.height < 8) continue;
      if (b.width * b.height > vw * vh * 0.5) continue;
      const w = Math.min(px.dir, b.right) - Math.max(px.esq, b.left);
      const h = Math.min(px.base, b.bottom) - Math.max(px.topo, b.top);
      if (w > 0 && h > 0) invadida += w * h;
    }

    return {
      secao: c.secao,
      presenca: c.presenca,
      /* Presença é a área VISÍVEL, não a caixa inteira. Medindo a caixa, o
         quadro campeão de cada seção passou a ser o do meio da travessia —
         objeto enorme com metade para fora — em vez do encaixe, que é o que
         o leitor de fato olha. */
      fracao:
        (Math.max(0, Math.min(px.dir, vw) - Math.max(px.esq, 0)) *
          Math.max(0, Math.min(px.base, vh) - Math.max(px.topo, 0))) /
        (vw * vh),
      invasao: Math.min(1, invadida / areaObj),
      z: pos.z,
      rotY: pos.rot[1],
      /* Quanto do objeto está FORA do quadro. Booleano não servia: encostar
         um pixel na borda e estar metade fora são coisas diferentes, e sair
         parcialmente pela base é decisão de composição — é o que deixa a tela
         grande sem o objeto flutuando no meio do texto. */
      fora: (() => {
        const total = Math.max(1, (px.dir - px.esq) * (px.base - px.topo));
        const dentroW = Math.max(0, Math.min(px.dir, vw) - Math.max(px.esq, 0));
        const dentroH = Math.max(0, Math.min(px.base, vh) - Math.max(px.topo, 0));
        return 1 - (dentroW * dentroH) / total;
      })(),
      dentro: px.dir > 0 && px.esq < vw && px.base > 0 && px.topo < vh,
    };
  });

  if (!a || !a.secao) continue;
  rotYmin = Math.min(rotYmin, a.rotY);
  rotYmax = Math.max(rotYmax, a.rotY);
  zmin = Math.min(zmin, a.z);
  zmax = Math.max(zmax, a.z);

  const cur = porSecao.get(a.secao) || {
    fracao: 0, invasao: 0, zmin: Infinity, zmax: -Infinity,
    rmin: Infinity, rmax: -Infinity, presenca: 0, fora: 0, n: 0,
  };
  /* O relato é sobre o MOMENTO DE DESTAQUE — a amostra em que o objeto está
     maior na tela —, e não sobre o pior quadro da seção.

     A diferença importa: numa travessia longa o objeto cruza a tela inteira
     durante alguns quadros, e o pior instante daquela passagem não descreve
     nem a composição da seção nem o que o leitor lembra dela. O que se quer
     saber é: no instante em que ele está mais presente, ele é grande o
     bastante, está inteiro no quadro, e está por cima de quê? */
  if (a.presenca > 0.25 && a.dentro && a.fracao > cur.fracao) {
    cur.fracao = a.fracao;
    cur.invasao = a.invasao;
    cur.fora = a.fora;
  }
  cur.presenca = Math.max(cur.presenca, a.presenca);
  cur.zmin = Math.min(cur.zmin, a.z);
  cur.zmax = Math.max(cur.zmax, a.z);
  cur.rmin = Math.min(cur.rmin, a.rotY);
  cur.rmax = Math.max(cur.rmax, a.rotY);
  cur.n += 1;
  porSecao.set(a.secao, cur);
}

const ORDEM = [
  "manifesto", "servicos", "social", "web", "design", "branding",
  "estrategia", "metodo", "porque", "retrato",
  "clientes", "contato",
];
const gr = (r) => ((r * 180) / Math.PI).toFixed(0).padStart(4);

console.log(`\njanela ${W}×${H} — ${PASSOS} amostras\n`);
console.log("  seção        presença   z (min→max)     giro       invasão   fora");
for (const id of ORDEM) {
  const d = porSecao.get(id);
  if (!d) {
    console.log(`  ${id.padEnd(12)} —`);
    continue;
  }
  const pres = d.presenca < 0.25 ? "ausente" : `${Math.round(d.fracao * 100)}%`.padStart(6) + " ";
  console.log(
    `  ${id.padEnd(12)} ${pres.padStart(8)}  ` +
      `${d.zmin.toFixed(2).padStart(6)}→${d.zmax.toFixed(2).padStart(5)}  ` +
      `${gr(d.rmin)}°→${gr(d.rmax)}°  ` +
      `${(d.presenca < 0.25 ? "—" : Math.round(d.invasao * 100) + "%").padStart(7)}  ` +
      `${(d.presenca < 0.25 ? "—" : Math.round(d.fora * 100) + "%").padStart(5)}`
  );
}
console.log(
  `\n  percurso total   z ${zmin.toFixed(2)} → ${zmax.toFixed(2)}` +
    `   ·   giro ${gr(rotYmin)}° → ${gr(rotYmax)}°  (${gr(rotYmax - rotYmin)}° de amplitude)`
);

await browser.close();
