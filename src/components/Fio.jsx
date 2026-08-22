import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "../lib/gsap";
import { sections } from "../content/story";
import { prefersReducedMotion } from "../lib/media";

/**
 * O fio condutor.
 *
 * Um traço dourado na guia esquerda, desenhado conforme se rola, com um nó
 * por seção. Existe por duas razões e não por enfeite: a página tem mais de
 * vinte telas, e um marcador POSICIONAL diz onde se está de um jeito que a
 * barra de progresso no topo — que é abstrata — não diz. E ele costura as
 * seções: o mesmo dourado da hero atravessa a narrativa inteira.
 *
 * Fica fora de qualquer contêiner transformado, como todo `position: fixed`
 * desta página.
 */
export default function Fio() {
  const raiz = useRef(null);

  useEffect(() => {
    const el = raiz.current;
    if (!el || prefersReducedMotion()) return;

    const traco = el.querySelector("[data-fio-traco]");
    const nos = [...el.querySelectorAll("[data-fio-no]")];
    const story = document.querySelector(".story");
    if (!traco || !story) return;

    gsap.set(el, { autoAlpha: 0 });

    /* O traço cresce com o progresso da narrativa. `scaleY` e não `height`:
       altura re-layouta, escala é do compositor. */
    const desenho = ScrollTrigger.create({
      trigger: story,
      start: "top center",
      end: "bottom bottom",
      onUpdate: (self) => gsap.set(traco, { scaleY: self.progress }),
      onToggle: (self) =>
        gsap.to(el, { autoAlpha: self.isActive ? 1 : 0, duration: 0.6, ease: "power2.out" }),
    });

    /* Um nó acende com a seção que está em cena. */
    const marcas = sections.map((s, i) =>
      ScrollTrigger.create({
        trigger: `[data-sec="${s.id}"]`,
        start: "top 60%",
        endTrigger: sections[i + 1] ? `[data-sec="${sections[i + 1].id}"]` : `[data-sec="${s.id}"]`,
        end: sections[i + 1] ? "top 60%" : "bottom bottom",
        onToggle: (self) => {
          if (!self.isActive) return;
          nos.forEach((no, k) => (no.dataset.aceso = String(k === i)));
        },
      })
    );

    return () => {
      desenho.kill();
      marcas.forEach((m) => m.kill());
    };
  }, []);

  return (
    <div className="fio" ref={raiz} aria-hidden="true">
      <span className="fio__calha" />
      <span className="fio__traco" data-fio-traco />
      <span className="fio__nos">
        {sections.map((s) => (
          <span className="fio__no" data-fio-no key={s.id} />
        ))}
      </span>
    </div>
  );
}
