/**
 * Apara o vazio em volta da assinatura do rodapé.
 *
 *   node scripts/trim-footer.mjs
 *
 * `public/logo-footer.png` veio no formato de post: 1080×1350, com a frase
 * ocupando uma faixa de 734×72 no meio e o resto transparente. Um arquivo
 * assim é impossível de dimensionar por CSS — travar a altura encolhe a frase
 * até virar um risco, e travar a largura estica a caixa por mais de mil pixels
 * de nada. Foi o que inchou o rodapé para 424px.
 *
 * A saída é `logo-footer-trim.png`, com a proporção real da frase. O ORIGINAL
 * NÃO É TOCADO: é o asset que veio do cliente.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, unlinkSync, statSync } from "node:fs";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const ENTRADA = "public/logo-footer.png";
const SAIDA = "public/logo-footer-trim.png";
const RASCUNHO = "scripts/_alpha.raw";

/** Largura e altura do arquivo, lidas do cabeçalho do PNG. */
const png = readFileSync(ENTRADA);
const W = png.readUInt32BE(16);
const H = png.readUInt32BE(20);

/* O canal alfa cru: é nele que está a informação de onde a tinta começa. */
execFileSync(
  ffmpeg,
  ["-y", "-i", ENTRADA, "-vf", "alphaextract", "-f", "rawvideo", "-pix_fmt", "gray", RASCUNHO],
  { stdio: "ignore" }
);

const alfa = readFileSync(RASCUNHO);
let x0 = W;
let y0 = H;
let x1 = -1;
let y1 = -1;

/* Limiar 12 e não 0: bordas suavizadas deixam um halo de alfa baixíssimo em
   volta da arte, e cortar por "diferente de zero" devolveria a imagem
   inteira. */
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (alfa[y * W + x] > 12) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
}
unlinkSync(RASCUNHO);

if (x1 < 0) {
  console.error("nada opaco em " + ENTRADA);
  process.exit(1);
}

/* Uma folga pequena em volta: colada na borda, a frase encosta em qualquer
   coisa que a rodeie no layout. */
const folga = 18;
const cx = Math.max(0, x0 - folga);
const cy = Math.max(0, y0 - folga);
const cw = Math.min(W - cx, x1 - x0 + 1 + folga * 2);
const ch = Math.min(H - cy, y1 - y0 + 1 + folga * 2);

execFileSync(ffmpeg, ["-y", "-i", ENTRADA, "-vf", `crop=${cw}:${ch}:${cx}:${cy}`, SAIDA], {
  stdio: "ignore",
});

const kb = (p) => (statSync(p).size / 1024).toFixed(0);
console.log(`${W}×${H} (${kb(ENTRADA)} KB) → ${cw}×${ch} (${kb(SAIDA)} KB)`);
console.log(`proporção da frase: ${(cw / ch).toFixed(2)}:1`);
