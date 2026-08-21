import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "../lib/gsap";

/**
 * Fio de progresso no topo. Deliberadamente quase invisível: serve para dar
 * noção de percurso numa página longa, não para chamar atenção.
 *
 * `scaleX` em vez de `width`: o compositor resolve sozinho, sem relayout a
 * cada quadro de scroll.
 */
export default function ScrollProgress() {
  const bar = useRef(null);

  useEffect(() => {
    const el = bar.current;
    if (!el) return;

    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => gsap.set(el, { scaleX: self.progress }),
    });

    return () => st.kill();
  }, []);

  return (
    <div className="progress" aria-hidden="true">
      <span className="progress__bar" ref={bar} />
    </div>
  );
}
