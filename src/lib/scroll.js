import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap";
import { prefersReducedMotion } from "./media";

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

  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

export const getLenis = () => lenis;
