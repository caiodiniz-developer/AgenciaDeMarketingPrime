import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "../lib/gsap";
import { EASE } from "../lib/motion";
import { POSTER } from "../lib/media";
import { getLenis } from "../lib/scroll";
import { prefersReducedMotion } from "../lib/media";

/**
 * Abertura do site.
 *
 * O contador reflete carregamento REAL — fontes e o primeiro quadro da hero —
 * e não um cronômetro disfarçado. Um loader que inventa espera é só atraso
 * pintado de bonito.
 *
 * O vídeo de 16 MB de propósito NÃO entra na conta: ele revela sozinho quando
 * puder, e prender a página inteira a ele seria trocar impressão por espera.
 * A trava de segurança garante que nada além de 4 s fique entre o usuário e a
 * hero, mesmo se algum recurso nunca resolver.
 */
const TETO_MS = 4000;

export default function Preloader() {
  const root = useRef(null);
  const numero = useRef(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    const lenis = getLenis();
    // Rolar durante a abertura deixaria o usuário no meio da hero ao abrir.
    lenis?.stop();

    const alvo = { v: 0 };
    let feitos = 0;
    const total = 2;

    const marcar = () => {
      feitos += 1;
      alvo.v = feitos / total;
    };

    document.fonts.ready.then(marcar);

    const img = new Image();
    img.onload = marcar;
    img.onerror = marcar; // falhar não pode prender a página
    img.src = POSTER;

    /* O número persegue o alvo em vez de saltar para ele: os degraus de
       "50 → 100" viram uma contagem, que é o que se quer ver. */
    let mostrado = 0;
    const tick = (_t, dt) => {
      const passo = Math.min(dt, 50) / 1000;
      mostrado += (alvo.v * 100 - mostrado) * (1 - Math.pow(1 - 0.09, passo * 60));
      if (numero.current) {
        numero.current.textContent = String(Math.min(100, Math.round(mostrado))).padStart(2, "0");
      }
      if (mostrado > 99.4) sair();
    };

    let saindo = false;
    const sair = () => {
      if (saindo) return;
      saindo = true;
      gsap.ticker.remove(tick);
      window.clearTimeout(trava);

      if (numero.current) numero.current.textContent = "100";

      const fim = () => {
        lenis?.start();
        setPronto(true);
        // A hero mede o trilho: sem isto, o ScrollTrigger guarda a altura de antes.
        ScrollTrigger.refresh();
      };

      if (prefersReducedMotion()) {
        gsap.to(root.current, { autoAlpha: 0, duration: 0.4, onComplete: fim });
        return;
      }

      /* Cortina que abre de baixo para cima descobrindo a hero: o mesmo
         gesto de uma cortina de cinema subindo. */
      gsap
        .timeline({ onComplete: fim })
        .to("[data-preloader-meta]", { autoAlpha: 0, y: -12, duration: 0.4, ease: EASE.out })
        .to(
          root.current,
          { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: EASE.expo },
          "-=0.1"
        );
    };

    const trava = window.setTimeout(() => {
      alvo.v = 1;
    }, TETO_MS);

    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.clearTimeout(trava);
      lenis?.start();
    };
  }, []);

  if (pronto) return null;

  return (
    <div className="preloader" ref={root} role="status" aria-live="polite">
      <span className="sr-only">Carregando</span>
      <div className="preloader__meta" data-preloader-meta>
        <span className="preloader__mark">AGÊNCIA PRIME</span>
        <span className="preloader__num" ref={numero} aria-hidden="true">
          00
        </span>
      </div>
    </div>
  );
}
