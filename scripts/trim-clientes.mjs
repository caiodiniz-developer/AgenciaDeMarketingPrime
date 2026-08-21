/**
 * Apara a margem vazia das logos de cliente.
 *
 * As marcas vêm com muito papel em branco em volta; dentro de uma placa, a
 * logo fica minúscula e a placa parece vazia. Aqui SÓ se corta o vazio — cor,
 * forma e proporção continuam intactas. Recolorir marca de terceiro seria
 * mexer no que não é nosso.
 *
 *   node scripts/trim-clientes.mjs
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, readdirSync, statSync } from "node:fs";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;

const DIR = "public/clientes";
if (!existsSync(DIR)) {
  console.log(`${DIR} não existe — nada a fazer.`);
  process.exit(0);
}

const originais = readdirSync(DIR).filter(
  (f) => /\.(png|jpg|jpeg|webp)$/i.test(f) && !f.includes("-apar")
);

for (const arquivo of originais) {
  const entrada = `${DIR}/${arquivo}`;
  const saida = entrada.replace(/(\.\w+)$/, "-aparada.png");

  /* Decodifica cru para achar a caixa do que está realmente pintado:
     ou opaco, ou visivelmente diferente do branco do papel. */
  const raw = execFileSync(
    ffmpeg,
    ["-v", "error", "-i", entrada, "-f", "rawvideo", "-pix_fmt", "rgba", "-"],
    { maxBuffer: 1 << 28 }
  );

  /* As dimensões vêm do ffprobe: `-select_streams` é opção dele, e o ffmpeg
     recusa a linha de comando inteira ao encontrá-la. */
  const meta = JSON.parse(
    execFileSync(
      ffprobe,
      [
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "json",
        entrada,
      ],
      { encoding: "utf8" }
    )
  );
  const { width: W, height: H } = meta.streams[0];

  /* O "fundo" é o que estiver no canto: umas logos vêm em papel branco
     opaco, outras em transparência. Assumir branco quebra as segundas — e a
     Real Pisos, que é BRANCA sobre transparente, perderia o nome inteiro. */
  const fundo = [raw[0], raw[1], raw[2], raw[3]];
  const ehFundo = (i) => {
    if (fundo[3] < 24) return raw[i + 3] < 24;
    return (
      raw[i + 3] > 24 &&
      Math.abs(raw[i] - fundo[0]) < 14 &&
      Math.abs(raw[i + 1] - fundo[1]) < 14 &&
      Math.abs(raw[i + 2] - fundo[2]) < 14
    );
  };

  let x0 = W;
  let y0 = H;
  let x1 = 0;
  let y1 = 0;
  let soma = 0;
  let pintados = 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      if (raw[i + 3] < 24 || ehFundo(i)) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
      soma += 0.299 * raw[i] + 0.587 * raw[i + 1] + 0.114 * raw[i + 2];
      pintados += 1;
    }
  }

  /* Luminância média do que está pintado: diz se a marca foi desenhada para
     fundo claro ou escuro. É o que decide se ela precisa de placa. */
  const luz = pintados ? soma / pintados : 0;

  if (x1 <= x0 || y1 <= y0) {
    console.log(`${arquivo}: nada pintado encontrado, pulando`);
    continue;
  }

  const folga = Math.round(Math.max(x1 - x0, y1 - y0) * 0.05);
  const cx = Math.max(0, x0 - folga);
  const cy = Math.max(0, y0 - folga);
  const cw = Math.min(W - cx, x1 - x0 + folga * 2);
  const ch = Math.min(H - cy, y1 - y0 + folga * 2);

  execFileSync(ffmpeg, [
    "-y", "-i", entrada,
    "-vf", `crop=${cw}:${ch}:${cx}:${cy},scale=-2:${Math.min(520, ch)}:flags=lanczos`,
    "-pix_fmt", "rgba", "-frames:v", "1", "-update", "1",
    saida,
  ]);

  console.log(
    `${arquivo}: ${W}x${H} → ${cw}x${ch} · luz ${Math.round(luz)} → ` +
      `${luz > 150 ? "marca CLARA (fundo escuro, sem placa)" : "marca ESCURA (precisa de placa clara)"}`
  );
}
