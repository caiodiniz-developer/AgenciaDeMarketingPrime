import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";
import { prefersReducedMotion } from "./media";
import { cena } from "./progress";

let lenis = null;

/**
 * Instância única, criada ANTES do primeiro render (main.jsx).
 * Efeitos de filho rodam antes dos do pai — se algo chamar lenis.stop()
 * no próprio efeito e a instância ainda não existir, a trava não pega.
 */
export function initSmoothScroll() {
  if (lenis) return lenis;

  lenis = new Lenis({
    // reduced-motion pede o fim do movimento autônomo, não do scroll suave:
    // suavizar a rolagem é resposta 1:1 ao gesto. Só encurtamos a inércia.
    lerp: prefersReducedMotion() ? 0.2 : 0.075,
    smoothWheel: true,
    syncTouch: false, // no touch, o nativo já é suave — interceptar só pesa
    wheelMultiplier: 1.1,
    touchMultiplier: 1,
    autoRaf: false, // o RAF é do GSAP: um relógio só para tudo
  });

  /* O Lenis já calcula a velocidade a cada quadro; ler dela é de graça.
     Medir por conta própria com um `scroll` listener daria o mesmo número
     com mais código e um quadro de atraso.

     A normalização é por 55 px/quadro — perto do topo de uma rolagem de
     roda comum. Acima disso satura, para que um "flick" violento não
     arremesse o objeto. */
  lenis.on("scroll", (e) => {
    ScrollTrigger.update();
    const v = e?.velocity ?? 0;
    cena.impulso = Math.max(-1, Math.min(1, v / 55));
  });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  /* Exposta para o harness de verificação. Rolar com `window.scrollTo` cru
     desincroniza o scroll suavizado — o Lenis arrasta a página de volta para
     o alvo dele no quadro seguinte —, e sem esta porta o teste media sempre
     um ponto diferente do que pediu. */
  if (typeof window !== "undefined") window.__lenis = lenis;

  return lenis;
}

export const getLenis = () => lenis;
