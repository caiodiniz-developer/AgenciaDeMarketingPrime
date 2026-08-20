/**
 * Escolhe a variante do vídeo pela capacidade real do aparelho e da rede.
 * As variantes são all-intra (scripts/encode-hero.mjs) — pesadas por natureza,
 * então servir a errada custa caro.
 */
const SOURCES = {
  high: { src: "/media/hero-1080.mp4", label: "1080p" },
  mid: { src: "/media/hero-720.mp4", label: "720p" },
  low: { src: "/media/hero-480.mp4", label: "480p" },
  static: { src: null, label: "poster" },
};

export const POSTER = "/media/poster.jpg";

export function pickTier() {
  if (typeof navigator === "undefined") return "mid";

  const conn = navigator.connection || {};
  const effective = conn.effectiveType || "";
  const memory = navigator.deviceMemory;

  // Sem vídeo: economia de dados, rede de 2G ou aparelho realmente fraco.
  if (conn.saveData) return "static";
  if (effective === "slow-2g" || effective === "2g") return "static";
  if (memory && memory <= 1) return "static";

  const width = window.innerWidth * (window.devicePixelRatio || 1);

  if (effective === "3g" || (memory && memory <= 4) || width < 900) return "low";
  if (width < 2000) return "mid";
  return "high";
}

export const sourceFor = (tier) => SOURCES[tier] || SOURCES.mid;

export const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
