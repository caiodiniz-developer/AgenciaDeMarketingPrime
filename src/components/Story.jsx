import { lazy, Suspense, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, SplitText } from "../lib/gsap";
import { paintGradientAcross, gradientToken } from "../lib/gradientText";
import { storyProgress } from "../lib/progress";
import { sections } from "../content/story";
import { pickTier } from "../lib/media";
import Section from "./Section";
import Rays from "./Rays";

// three.js sozinho pesa mais que todo o resto do site: sai do caminho da hero.
const LaptopScene = lazy(() => import("./LaptopScene"));

/** Nível da luz por seção, quantizado: o shader só re-renderiza nas trocas. */
const rayLevelFor = (index) => (sections[index]?.rays ? 1 : 0.05);

/**
 * A parte da página que vem depois da hero.
 *
 * Camadas, de trás para frente: LUZ (GodRays) → véu → 3D (laptop) → seções.
 * Luz e laptop são sticky e atravessam a narrativa inteira, de modo que a
 * cena é contínua e só o conteúdo passa por ela.
 *
 * As seções de tema "bone" são opacas: elas cortam a cena de propósito, dão
 * respiro à leitura e fazem a volta ao preto valer alguma coisa.
 */
export default function Story() {
  const root = useRef(null);
  const raysBox = useRef(null);

  const [active, setActive] = useState(false);
  const [level, setLevel] = useState(rayLevelFor(0));
  // Aparelho fraco não ganha nem shader fullscreen nem WebGL de modelo.
  const [rich] = useState(() => pickTier() !== "static");

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      /* Espinha dorsal: um trigger só para a região inteira alimenta o 3D e
         o nível da luz. Um por seção seria trabalho repetido a cada quadro. */
      const spine = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom bottom",
        onUpdate: (self) => {
          storyProgress.value = self.progress;

          const index = Math.min(
            sections.length - 1,
            Math.floor(self.progress * sections.length)
          );
          setLevel(rayLevelFor(index));
        },
      });

      /* Separado do progresso de propósito: o trigger acima termina com o
         fim da página, e é exatamente ali que o modelo precisa continuar
         desenhando, parado de frente. */
      const alive = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => setActive(self.isActive),
        onRefresh: (self) => setActive(self.isActive),
      });

      /* A luz acende só nas seções marcadas. Mexer no `level` do shader não
         bastava: com `mix-blend-mode: screen` sobre preto, mesmo intensidade
         baixa continua aparecendo. Quem apaga de verdade é a opacidade. */
      const raysTriggers = sections.map((s) =>
        ScrollTrigger.create({
          trigger: `[data-sec="${s.id}"]`,
          start: "top 65%",
          end: "bottom 35%",
          onToggle: (self) => {
            if (!self.isActive || !raysBox.current) return;
            gsap.to(raysBox.current, {
              opacity: s.rays ? 1 : 0.04,
              duration: 1.4,
              ease: "power2.inOut",
              overwrite: "auto",
            });
          },
        })
      );

      /* A barra troca de tema junto com a seção que passa por baixo dela.
         Sem isto, o logo claro sumiria em cima do bege. */
      const themeTriggers = sections
        .filter((s) => s.theme === "bone")
        .map((s) =>
          ScrollTrigger.create({
            trigger: `[data-sec="${s.id}"]`,
            start: "top 12%",
            end: "bottom 12%",
            onToggle: (self) =>
              document.documentElement.setAttribute(
                "data-nav-theme",
                self.isActive ? "bone" : "ink"
              ),
          })
        );

      mm.add(
        {
          desktop: "(min-width: 768px)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { desktop, reduce } = ctx.conditions;
          const haze = desktop && !reduce ? 6 : 0;
          const splits = [];

          sections.forEach(({ id, theme }) => {
            const [title] = q(`[data-sec="${id}"] [data-sec-title]`);
            const [body] = q(`[data-sec="${id}"] [data-sec-body]`);

            const titleSplit = title && new SplitText(title, { type: "lines", mask: "lines" });
            const bodySplit = body && new SplitText(body, { type: "lines" });

            if (titleSplit) {
              splits.push(titleSplit);
              // No bege o gradiente claro sumiria: lá o título é tinta cheia.
              if (theme !== "bone") {
                paintGradientAcross(title, titleSplit.lines, gradientToken("--grad-title-soft"));
              }
            }
            if (bodySplit) splits.push(bodySplit);

            const label = q(`[data-sec="${id}"] [data-sec-label]`);
            const hair = q(`[data-sec="${id}"] [data-sec-hair]`);
            const items = q(`[data-sec="${id}"] [data-sec-item]`);
            const rules = q(`[data-sec="${id}"] [data-sec-rule]`);
            const draws = q(`[data-sec="${id}"] [data-draw]`);
            const pops = q(`[data-sec="${id}"] [data-pop]`);

            /* Estado escondido explícito, sempre — depender do immediateRender
               de um fromTo adiante do playhead é frágil, e quando falha o
               conteúdo aparece todo empilhado. */
            if (reduce) {
              gsap.set(
                [
                  ...label,
                  ...(titleSplit?.lines || []),
                  ...(bodySplit?.lines || []),
                  ...items,
                  ...pops,
                ],
                { autoAlpha: 1, y: 0, yPercent: 0, scale: 1, filter: "blur(0px)" }
              );
              gsap.set([...hair, ...rules], { scaleY: 1, scaleX: 1 });
              gsap.set(draws, { drawSVG: "0% 100%" });
              return;
            }

            gsap.set(label, { autoAlpha: 0, y: 16 });
            gsap.set(hair, { scaleY: 0 });
            gsap.set(rules, { scaleX: 0 });
            gsap.set(titleSplit?.lines || [], { yPercent: 108 });
            gsap.set(bodySplit?.lines || [], {
              autoAlpha: 0,
              y: 22,
              filter: haze ? `blur(${haze}px)` : "none",
            });
            gsap.set(items, { autoAlpha: 0, y: 34 });
            gsap.set(draws, { drawSVG: "0% 0%" });
            gsap.set(pops, { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" });

            /* Entrada por tempo, disparada uma vez pelo scroll: aqui o
               conteúdo é leitura, não sequência — prender ao dedo faria o
               texto tremer enquanto se lê. */
            const tl = gsap.timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: { trigger: `[data-sec="${id}"]`, start: "top 72%", once: true },
            });

            tl.to(label, { autoAlpha: 1, y: 0, duration: 0.8 })
              .to(hair, { scaleY: 1, duration: 1, ease: "power2.inOut" }, "-=0.6")
              .to(titleSplit?.lines || [], { yPercent: 0, duration: 1.15, stagger: 0.09 }, "-=0.75")
              .to(
                bodySplit?.lines || [],
                { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.95, stagger: 0.06 },
                "-=0.8"
              )
              // Sobreposição: os itens começam antes de o parágrafo terminar.
              .to(items, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.12 }, "-=0.7")
              .to(rules, { scaleX: 1, duration: 0.9, stagger: 0.12 }, "<")
              /* O traço é riscado, não revelado por opacidade: é o desenho
                 acontecendo, e é isso que dá vida ao símbolo. */
              .to(
                draws,
                { drawSVG: "0% 100%", duration: 1.1, ease: "power2.inOut", stagger: 0.06 },
                "-=0.85"
              )
              // O acento entra depois do traço fechar — a ordem conta a ideia.
              .to(
                pops,
                { autoAlpha: 1, scale: 1, duration: 0.55, ease: "back.out(2)", stagger: 0.06 },
                "-=0.35"
              );
          });

          /* A luz respira com o scroll pelo CONTÊINER — os uniforms do shader
             ficam quietos e o framerate não paga por isso. */
          if (!reduce && raysBox.current) {
            gsap.fromTo(
              raysBox.current,
              { scale: 1.2, yPercent: 7 },
              {
                scale: 1,
                yPercent: -7,
                ease: "none",
                scrollTrigger: {
                  trigger: root.current,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: true,
                },
              }
            );
          }

          return () => splits.forEach((s) => s.revert());
        }
      );

      return () => {
        mm.revert();
        spine.kill();
        alive.kill();
        raysTriggers.forEach((t) => t.kill());
        themeTriggers.forEach((t) => t.kill());
        document.documentElement.removeAttribute("data-nav-theme");
      };
    },
    { scope: root }
  );

  return (
    <div className="story" ref={root}>
      {rich && (
        <>
          <div
            className="story__rays"
            ref={raysBox}
            style={{ opacity: sections[0].rays ? 1 : 0.04 }}
          >
            <Rays level={level} warm />
          </div>
          <div className="story__veil" aria-hidden="true" />
          <Suspense fallback={null}>
            <LaptopScene active={active} />
          </Suspense>
        </>
      )}

      {sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </div>
  );
}
