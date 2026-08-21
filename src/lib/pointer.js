/**
 * Ponteiro suavizado, compartilhado.
 *
 * Uma instância só para a página inteira: cursor, botões magnéticos, preview
 * que segue o mouse e a luz de fundo leem daqui. Cada um com o seu próprio
 * listener de `pointermove` seria o mesmo trabalho repetido N vezes por quadro.
 *
 * Nada aqui segue o cursor instantaneamente — quem lê aplica o próprio lerp.
 * O salto direto é o que faz um efeito parecer barato.
 */

export const pointer = {
  /** Posição crua, em pixels de viewport. */
  x: 0,
  y: 0,
  /** Mesma posição normalizada em -1..1, com 0 no centro da tela. */
  nx: 0,
  ny: 0,
  /** Falso até o primeiro movimento: evita animar a partir do canto (0,0). */
  active: false,
};

let bound = false;

export function watchPointer() {
  if (bound || typeof window === "undefined") return;
  bound = true;

  const onMove = (e) => {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.active = true;
  };

  window.addEventListener("pointermove", onMove, { passive: true });
}

/** Interpolação estável em qualquer framerate. */
export const damp = (a, b, lambda, dt) =>
  a + (b - a) * (1 - Math.pow(1 - lambda, Math.min(dt, 0.05) * 60));

/** Aparelho de toque não tem hover: tudo que depende de mouse fica de fora. */
export const isTouch = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
