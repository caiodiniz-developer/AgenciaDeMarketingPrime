/**
 * Prepara os vídeos das frentes para a web.
 *
 * Os originais vêm da ilha de edição: até 4K e 18 Mbps. Servir isso é jogar
 * dezenas de megabytes na cara de quem abre a página — e eles aparecem como
 * FUNDO, atrás de texto e escurecidos, onde ninguém contaria os pixels.
 *
 * Duas saídas por vídeo, servidas por tamanho de tela (src/lib/media.js):
 *   1280px para desktop · 720px para telas pequenas e conexões magras
 *
 * O poster é o primeiro quadro: sem ele, o fundo pisca preto enquanto o
 * vídeo carrega.
 *
 *   npm run encode:videos
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readdirSync, statSync } from "node:fs";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");

const ORIGEM = "media/frentes";
const DESTINO = "public/videos";

/* Os originais moram fora de `public/` para não irem parar no build. Se ainda
   estiverem em `public/videos`, é de lá que se lê — e a saída os substitui. */
const pasta = existsSync(ORIGEM) ? ORIGEM : DESTINO;
if (!existsSync(pasta)) {
  console.error(`nada em ${pasta}`);
  process.exit(1);
}
mkdirSync(DESTINO, { recursive: true });

const VARIANTES = [
  { sufixo: "", largura: 1280, crf: 30 },
  { sufixo: "-sm", largura: 720, crf: 32 },
];

const mb = (p) => (statSync(p).size / 1048576).toFixed(1);

const originais = readdirSync(pasta).filter(
  (f) => /\.mp4$/i.test(f) && !/-sm\.mp4$/i.test(f)
);

for (const arquivo of originais) {
  const entrada = `${pasta}/${arquivo}`;
  const nome = arquivo.replace(/\.mp4$/i, "");
  const antes = mb(entrada);

  for (const { sufixo, largura, crf } of VARIANTES) {
    const saida = `${DESTINO}/${nome}${sufixo}.mp4`;
    const temporario = `${DESTINO}/${nome}${sufixo}.tmp.mp4`;

    execFileSync(ffmpeg, [
      "-y", "-i", entrada,
      "-an", // o vídeo é fundo e nunca toca com som: áudio é peso morto
      "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
      "-vf", `scale=${largura}:-2:flags=lanczos,fps=24`,
      "-crf", String(crf), "-preset", "slow",
      "-movflags", "+faststart",
      temporario,
    ]);

    // Só troca no fim: um ffmpeg interrompido não deixa o original truncado.
    execFileSync(process.platform === "win32" ? "cmd" : "mv",
      process.platform === "win32"
        ? ["/c", "move", "/y", temporario.replace(/\//g, "\\"), saida.replace(/\//g, "\\")]
        : [temporario, saida],
      { stdio: "ignore" }
    );

    console.log(`  ${saida} · ${mb(saida)} MB`);
  }

  execFileSync(ffmpeg, [
    "-y", "-i", entrada,
    "-vf", "scale=960:-2:flags=lanczos",
    "-frames:v", "1", "-q:v", "6", "-update", "1",
    `${DESTINO}/${nome}.jpg`,
  ]);

  console.log(`${arquivo}: ${antes} MB → ${mb(`${DESTINO}/${nome}.mp4`)} MB (+ poster)\n`);
}
