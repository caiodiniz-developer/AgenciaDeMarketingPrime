import { useEffect, useRef } from "react";
import { gsap } from "../lib/gsap";
import { pointer, damp, isTouch } from "../lib/pointer";
import { prefersReducedMotion } from "../lib/media";

/**
 * Luz de ambiente que acompanha o ponteiro, lá atrás de tudo.
 *
 * Serve para o preto não ser um vazio chapado: o fundo responde de leve à
 * presença de quem está lendo. O lerp é propositalmente lento (0.045) — a luz
 * chega bem depois do cursor, e é esse atraso que a faz parecer volume de ar
 * em vez de um holofote grudado no mouse.
 *
 * Só `transform`, nunca `background-position`: mover o gradiente redesenharia
 * a camada inteira a cada quadro.
 */
export default function AmbientLight() {
  const el = useRef(null);

  useEffect(() => {
    const glow = el.current;
    if (!glow || isTouch() || prefersReducedMotion()) return;

    let x = window.innerWidth / 2;
    let y = window.innerHeight * 0.4;
    const setX = gsap.quickSetter(glow, "x", "px");
    const setY = gsap.quickSetter(glow, "y", "px");
    setX(x);
    setY(y);

    const tick = (_t, dt) => {
      if (!pointer.active) return;
      const s = dt / 1000;
      x = damp(x, pointer.x, 0.045, s);
      y = damp(y, pointer.y, 0.045, s);
      setX(x);
      setY(y);
    };

    gsap.ticker.add(tick);
    gsap.to(glow, { autoAlpha: 1, duration: 1.6, ease: "power2.out", delay: 0.4 });

    return () => gsap.ticker.remove(tick);
  }, []);

  return <div className="ambient" ref={el} aria-hidden="true" />;
}
