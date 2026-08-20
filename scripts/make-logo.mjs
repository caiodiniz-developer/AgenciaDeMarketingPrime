/**
 * O logo original é preto sobre fundo TRANSPARENTE, com muita margem vazia:
 * numa barra escura ele some, e limitado pela altura vira um risco fino
 * porque a maior parte da tela do arquivo é vazio.
 *
 * Este script recorta na caixa real do texto e inverte só o RGB, gerando a
 * versão clara para fundo escuro. O arquivo original continua servindo às
 * seções bege.
 *
 *   node scripts/make-logo.mjs
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { statSync } from "node:fs";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const SRC = "public/logo.png";
const OUT_LIGHT = "public/logo-nav.png"; // claro, para fundo escuro
const OUT_DARK = "public/logo-mark.png"; // escuro, para fundo bege
const W = 1080;

/* 1. Acha a caixa dos pixels realmente pintados. */
const raw = execFileSync(
  ffmpeg,
  ["-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
  { maxBuffer: 1 << 28 }
);

const H = raw.length / 4 / W;
if (!Number.isInteger(H)) throw new Error(`dimensões inesperadas: ${raw.length} bytes`);

let x0 = W;
let y0 = H;
let x1 = 0;
let y1 = 0;

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    // O fundo é transparente: o alfa é o primeiro critério.
    if (raw[i + 3] < 24) continue;
    // E só o texto conta: a elipse dourada abaixo dele é clara, e incluí-la
    // no recorte a faria virar um borrão azul na inversão.
    const luma = 0.299 * raw[i] + 0.587 * raw[i + 1] + 0.114 * raw[i + 2];
    if (luma > 110) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
}

const pad = 6;
const cx = Math.max(0, x0 - pad);
const cy = Math.max(0, y0 - pad);
const cw = Math.min(W - cx, x1 - x0 + pad * 2);
const ch = Math.min(H - cy, y1 - y0 + pad * 2);

console.log(`origem ${W}x${H} → caixa pintada ${cw}x${ch} em (${cx},${cy})`);

const crop = `crop=${cw}:${ch}:${cx}:${cy}`;
const scale = "scale=-2:240:flags=lanczos";

const render = (out, filters) =>
  execFileSync(ffmpeg, [
    "-y", "-i", SRC,
    "-vf", filters.join(","),
    // Sem isto o encoder escolhe rgb24 e o recorte perde a transparência.
    "-pix_fmt", "rgba",
    "-frames:v", "1",
    "-update", "1",
    out,
  ]);

/* `lutrgb` em vez de `negate`: o negate também vira o canal alfa, e o
   resultado sai ao contrário — fundo opaco com as letras vazadas. */
render(OUT_LIGHT, [crop, "format=rgba", "lutrgb=r=255-val:g=255-val:b=255-val", scale]);
render(OUT_DARK, [crop, "format=rgba", scale]);

for (const f of [OUT_LIGHT, OUT_DARK]) {
  console.log(`${f} · ${(statSync(f).size / 1024).toFixed(1)} KB`);
}
