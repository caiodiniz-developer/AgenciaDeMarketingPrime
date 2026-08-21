import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsap";
import { EASE, DUR } from "../lib/motion";
import { isTouch } from "../lib/pointer";
import { prefersReducedMotion } from "../lib/media";

/**
 * Botão magnético: dentro de um raio, o elemento acompanha o cursor de leve;
 * ao sair, volta com uma elástica discretíssima.
 *
 * O texto interno anda MENOS que o botão. É essa diferença que vende o peso —
 * mover os dois juntos parece só um deslocamento, não um objeto reagindo.
 *
 * Fica de fora em toque e em reduced-motion: sem hover, o efeito não existe,
 * e o botão precisa continuar sendo só um botão.
 */
export function useMagnetic({ strength = 0.32, radius = 90, textStrength = 0.4 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || isTouch() || prefersReducedMotion()) return;

    const inner = el.querySelector("[data-magnetic-inner]") || null;
    const moveEl = gsap.quickTo(el, "x", { duration: DUR.ui, ease: EASE.out });
    const moveElY = gsap.quickTo(el, "y", { duration: DUR.ui, ease: EASE.out });
    const moveIn = inner && gsap.quickTo(inner, "x", { duration: DUR.ui, ease: EASE.out });
    const moveInY = inner && gsap.quickTo(inner, "y", { duration: DUR.ui, ease: EASE.out });

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);

      moveEl(dx * strength);
      moveElY(dy * strength);
      if (moveIn) {
        moveIn(dx * strength * textStrength);
        moveInY(dy * strength * textStrength);
      }
    };

    const onLeave = () => {
      /* `overwrite: "auto"` e não `true`: o true mata TODAS as tweens do
         elemento, e matar na mão quebra o quickTo, que depende de uma tween
         persistente. "auto" desfaz só o conflito de x/y — que é o único que
         existe, porque o reveal da seção anima o contêiner, não o botão. */
      gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: EASE.spring, overwrite: "auto" });
      if (inner) {
        gsap.to(inner, { x: 0, y: 0, duration: 0.9, ease: EASE.spring, overwrite: "auto" });
      }
    };

    /* O raio é medido a partir da borda, não do centro: um botão largo
       precisa reagir antes de o cursor chegar ao meio dele. */
    const onWindowMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
      const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
      if (Math.hypot(dx, dy) < radius) onMove(e);
      else onLeave();
    };

    window.addEventListener("pointermove", onWindowMove, { passive: true });
    /* Sem isto, tirar o mouse pela borda da janela não gera mais nenhum
       pointermove e o botão fica deslocado para sempre. */
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);

    return () => {
      window.removeEventListener("pointermove", onWindowMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      const alvos = [el, inner].filter(Boolean);
      gsap.killTweensOf(alvos, "x,y");
      gsap.set(alvos, { x: 0, y: 0 });
    };
  }, [strength, radius, textStrength]);

  return ref;
}
