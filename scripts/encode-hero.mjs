/**
 * Reencoda o master da hero em variantes ALL-INTRA (1 keyframe por quadro).
 * Sem isso o scrub engasga: para exibir um quadro qualquer o decoder teria
 * que voltar ao keyframe anterior e decodificar tudo até lá.
 *
 *   npm run encode:hero
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, statSync, existsSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffmpeg = require("ffmpeg-static");
const ffprobe = require("ffprobe-static").path;

const MASTER = "media/hero-master.mp4";
const OUT_DIR = "public/media";

/** Uma variante por capacidade de rede/tela. Servidas pelo tier em src/lib/media.js */
const VARIANTS = [
  { name: "hero-1080", width: 1920, crf: 26 },
  { name: "hero-720", width: 1280, crf: 27 },
  { name: "hero-480", width: 854, crf: 30 },
];

const run = (bin, args) =>
  execFileSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(1);

if (!existsSync(MASTER)) {
  console.error(`master não encontrado: ${MASTER}`);
  process.exit(1);
}
mkdirSync(OUT_DIR, { recursive: true });

for (const { name, width, crf } of VARIANTS) {
  const out = `${OUT_DIR}/${name}.mp4`;
  console.log(`\n→ ${name} (${width}px, crf ${crf})`);

  run(ffmpeg, [
    "-y", "-i", MASTER,
    "-an",                                   // o vídeo nunca toca: áudio é peso morto
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-vf", `scale=${width}:-2:flags=lanczos`,
    "-crf", String(crf), "-preset", "slow",
    "-g", "1", "-keyint_min", "1", "-sc_threshold", "0",   // all-intra
    "-movflags", "+faststart",
    out,
  ]);

  // Confirma o all-intra em vez de confiar no comando.
  const frames = run(ffprobe, [
    "-v", "error", "-select_streams", "v:0",
    "-show_entries", "frame=key_frame", "-of", "csv=p=0", out,
  ])
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);

  const inter = frames.filter((f) => f.replace(/,/g, "") !== "1").length;
  console.log(
    `  ${frames.length} quadros · ${inter} não-keyframe · ${mb(out)} MB` +
      (inter ? "  ✗ ENCODE FALHOU" : "  ✓ all-intra")
  );
  if (inter) process.exitCode = 1;
}

// Poster: primeiro quadro, evita tela preta enquanto o vídeo carrega.
console.log("\n→ poster.jpg");
run(ffmpeg, [
  "-y", "-i", MASTER,
  "-vf", "scale=1920:-2:flags=lanczos",
  "-frames:v", "1", "-q:v", "4",
  `${OUT_DIR}/poster.jpg`,
]);
console.log(`  ${mb(`${OUT_DIR}/poster.jpg`)} MB`);
