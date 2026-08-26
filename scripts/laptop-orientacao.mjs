/**
 * Descobridor de orientação do modelo 3D.
 *
 *   node scripts/laptop-orientacao.mjs <saída> <x,y,z> [<x,y,z> ...]
 *   node scripts/laptop-orientacao.mjs ./tmp 0,0,0 -90,0,-90
 *
 * Para cada candidato (graus, ordem XYZ) ele imprime a CAIXA de cada malha
 * depois do giro e salva uma captura do fecho da página, onde o objeto está
 * grande e de frente.
 *
 * POR QUE ISTO EXISTE
 * O arquivo em /public já foi trocado uma vez sem aviso, e o sintoma não foi
 * um erro: foi um notebook de perfil, plausível o bastante para sobreviver a
 * uma leitura de código e a 79 asserções automáticas. A orientação de repouso
 * é a única coisa do projeto que não se deduz — só se vê.
 *
 * COMO LER A SAÍDA
 * A resposta certa é aquela em que o TECLADO fica fino no eixo Y (deitado) e
 * a TELA fina no eixo Z (em pé, atrás e acima do teclado). Cuidado com a
 * armadilha: as caixas impressas já vêm giradas pelo valor testado, então
 * elas descrevem o RESULTADO da hipótese, nunca o conteúdo cru do arquivo.
 * Conferir na captura é obrigatório.
 */
import puppeteer from "puppeteer-core";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = process.env.PRIME_URL || "http://localhost:5402/";
const OUT = process.argv[2];
const CANDIDATOS = process.argv.slice(3);

if (!OUT || !CANDIDATOS.length) {
  console.log("uso: node scripts/laptop-orientacao.mjs <pasta> <x,y,z> [...]");
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--mute-audio", "--autoplay-policy=no-user-gesture-required"],
});

for (const rot of CANDIDATOS) {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(`${URL}?laptop=debug&rot=${rot}`, { waitUntil: "networkidle2" });
  await sleep(2000);

  /* Até o fecho, em degraus: um salto único deixaria o canvas sem desenhar
     nenhum quadro no caminho, e a captura sairia do estado anterior. */
  for (const f of [0.3, 0.6, 0.85, 0.95, 1]) {
    await page.evaluate(
      (k) => window.__lenis.scrollTo(document.body.scrollHeight * k, { immediate: true }),
      f
    );
    await sleep(500);
  }
  await sleep(1200);

  const malhas = await page.evaluate(() =>
    (window.__laptop || []).map((m) => ({ material: m.material, cor: m.cor, tamanho: m.tamanho, centro: m.centro }))
  );
  console.log(`\nrot=${rot}`);
  malhas.forEach((m) => {
    const [x, y, z] = m.tamanho;
    const fino = x < y && x < z ? "X (de lado)" : y < x && y < z ? "Y (deitado)" : "Z (em pé)";
    console.log(`   ${m.material.padEnd(22)} ${JSON.stringify(m.tamanho)}  fino em ${fino}  centro ${JSON.stringify(m.centro)}`);
  });

  const arquivo = `${OUT}/orientacao-${rot.replace(/,/g, "_")}.png`;
  await page.screenshot({ path: arquivo });
  console.log(`   → ${arquivo}`);
  await page.close();
}

await browser.close();
