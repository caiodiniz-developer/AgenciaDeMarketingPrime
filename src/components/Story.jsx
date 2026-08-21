import { lazy, Suspense, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, SplitText } from "../lib/gsap";
import { paintGradientAcross, gradientToken } from "../lib/gradientText";
import { storyProgress } from "../lib/progress";
import { sections } from "../content/story";
import { pickTier } from "../lib/media";
import { EASE, DUR, STAGGER, BEAT, DEPTH } from "../lib/motion";
import { pointer, damp, isTouch } from "../lib/pointer";
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
 * Luz e laptop são sticky e atravessam a narrativa inteira: a cena é contínua
 * e só o conteúdo passa por ela.
 *
 * Cada layout tem UMA interação-assinatura, e nenhuma se repete — é isso que
 * separa uma página projetada de uma pilha de seções com fade-in.
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
          const i = Math.min(sections.length - 1, Math.floor(self.progress * sections.length));
          setLevel(rayLevelFor(i));
        },
      });

      /* Separado do progresso de propósito: o trigger acima termina com o fim
         da página, e é ali que o modelo precisa continuar desenhando. */
      const alive = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => setActive(self.isActive),
        onRefresh: (self) => setActive(self.isActive),
      });

      /* A luz acende só nas seções marcadas. Mexer no `level` do shader não
         basta: com `mix-blend-mode: screen` sobre preto, mesmo intensidade
         baixa continua aparecendo. Quem apaga de verdade é a opacidade. */
      const avulsos = sections.map((s) =>
        ScrollTrigger.create({
          trigger: `[data-sec="${s.id}"]`,
          start: "top 65%",
          end: "bottom 35%",
          onToggle: (self) => {
            if (!self.isActive || !raysBox.current) return;
            gsap.to(raysBox.current, {
              opacity: s.rays ? 1 : 0.04,
              duration: 1.4,
              ease: EASE.inOut,
              overwrite: "auto",
            });
          },
        })
      );

      /* A barra troca de tema junto com a seção que passa por baixo dela:
         sem isto, o logo claro sumiria em cima do bege. */
      sections
        .filter((s) => s.theme === "bone")
        .forEach((s) =>
          avulsos.push(
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
          )
        );

      mm.add(
        {
          desktop: "(min-width: 1024px)",
          mobile: "(max-width: 1023px)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { desktop, reduce } = ctx.conditions;
          const splits = [];
          const limpezas = [];

          /* ── Tipografia: linhas mascaradas, palavras animadas ───────────
             O gradiente é pintado nas PALAVRAS, não nas linhas: uma palavra
             que sobe carrega o próprio fundo junto. Pintada na linha, a tinta
             sairia da caixa de fundo durante o movimento e a palavra subiria
             invisível — o reveal simplesmente não apareceria. */
          const dividir = (el, tema) => {
            if (!el) return null;
            const split = new SplitText(el, {
              type: "lines,words",
              mask: "lines",
              wordsClass: "tw",
            });
            splits.push(split);
            if (tema !== "bone") {
              paintGradientAcross(el, split.words, gradientToken("--grad-title-soft"));
            }
            return split;
          };

          /* ── Profundidade: cada camada anda a uma velocidade ───────────── */
          const montarParallax = (escopo) => {
            if (reduce || !desktop) return;
            q(`${escopo} [data-parallax]`).forEach((el) => {
              const fator = DEPTH[el.dataset.parallax] ?? DEPTH.front;
              const curso = (fator - DEPTH.front) * 220;
              if (!curso) return;
              gsap.fromTo(
                el,
                { y: curso },
                {
                  y: -curso,
                  ease: "none",
                  scrollTrigger: {
                    trigger: el.closest(".sec"),
                    start: "top bottom",
                    end: "bottom top",
                    scrub: true,
                  },
                }
              );
            });
          };

          sections.forEach(({ id, theme, layout }) => {
            const sel = `[data-sec="${id}"]`;
            const [sec] = q(sel);
            const [titleEl] = q(`${sel} [data-sec-title]`);
            const [bodyEl] = q(`${sel} [data-sec-body]`);

            const tSplit = dividir(titleEl, theme);
            const bSplit = bodyEl && new SplitText(bodyEl, { type: "lines" });
            if (bSplit) splits.push(bSplit);

            const label = q(`${sel} [data-sec-label]`);
            const hair = q(`${sel} [data-sec-hair]`);
            const items = q(`${sel} [data-sec-item]`);
            const rules = q(`${sel} [data-sec-rule]`);
            const draws = q(`${sel} [data-draw]`);
            const pops = q(`${sel} [data-pop]`);
            const palavras = tSplit?.words || [];
            const linhas = bSplit?.lines || [];

            /* Estado escondido explícito, sempre — depender do immediateRender
               de um fromTo adiante do playhead é frágil, e quando falha o
               conteúdo aparece todo empilhado. */
            if (reduce) {
              gsap.set([...label, ...palavras, ...linhas, ...items, ...pops], {
                autoAlpha: 1,
                y: 0,
                yPercent: 0,
                rotateX: 0,
                scale: 1,
                filter: "blur(0px)",
              });
              gsap.set([...hair, ...rules], { scaleY: 1, scaleX: 1 });
              gsap.set(draws, { drawSVG: "0% 100%" });
              return;
            }

            gsap.set(label, { autoAlpha: 0, y: 16 });
            gsap.set(hair, { scaleY: 0 });
            gsap.set(rules, { scaleX: 0 });
            gsap.set(palavras, { yPercent: 112, rotateX: -38, autoAlpha: 0 });
            gsap.set(linhas, { autoAlpha: 0, y: 22, filter: desktop ? "blur(6px)" : "none" });
            gsap.set(items, { autoAlpha: 0, y: 34 });
            gsap.set(draws, { drawSVG: "0% 0%" });
            gsap.set(pops, { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" });

            /* Seções "conduzidas" pelo scroll: o leitor sente que controla o
               reveal. As outras entram por tempo — texto que treme enquanto
               se lê é desconforto, não sofisticação. */
            const conduzida = layout === "split" || layout === "statement" || layout === "cta";

            const tl = gsap.timeline({
              defaults: { ease: EASE.out },
              scrollTrigger: conduzida
                ? { trigger: sec, start: "top 88%", end: "top 34%", scrub: 0.6 }
                : { trigger: sec, start: "top 74%", once: true },
            });

            /* Hierarquia com SOBREPOSIÇÃO: cada elemento parte antes de o
               anterior assentar. Em degraus, a seção denuncia a máquina. */
            tl.to(label, { autoAlpha: 1, y: 0, duration: DUR.reveal }, BEAT.label)
              .to(hair, { scaleY: 1, duration: 1, ease: EASE.inOut }, BEAT.label + 0.1)
              .to(
                palavras,
                {
                  yPercent: 0,
                  rotateX: 0,
                  autoAlpha: 1,
                  duration: 1.15,
                  ease: EASE.outLong,
                  stagger: STAGGER.words,
                },
                BEAT.title
              )
              .to(
                linhas,
                {
                  autoAlpha: 1,
                  y: 0,
                  filter: "blur(0px)",
                  duration: DUR.reveal,
                  stagger: STAGGER.lines * 0.7,
                },
                BEAT.body
              )
              .to(
                items,
                { autoAlpha: 1, y: 0, duration: DUR.reveal, stagger: STAGGER.items },
                BEAT.items
              )
              .to(rules, { scaleX: 1, duration: 0.9, stagger: STAGGER.items }, BEAT.items)
              /* O traço é riscado, não revelado por opacidade: é o desenho
                 acontecendo, e é isso que dá vida ao símbolo. */
              .to(
                draws,
                { drawSVG: "0% 100%", duration: 1.1, ease: EASE.inOut, stagger: 0.06 },
                BEAT.items + 0.05
              )
              // O acento entra depois do traço fechar — a ordem conta a ideia.
              .to(
                pops,
                { autoAlpha: 1, scale: 1, duration: 0.55, ease: "back.out(2)", stagger: 0.06 },
                BEAT.cta
              );

            montarParallax(sel);
          });

          /* ═══ Assinaturas por seção ═══════════════════════════════════ */

          if (!reduce) {
            limpezas.push(
              transicaoEntreSecoes(q, desktop),
              servicosInterativos(q, desktop),
              processoPreso(q),
              trilhoHorizontal(q, desktop),
              manifestoCinematografico(q),
              ctaCinematografico(q, desktop)
            );
          }

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

          return () => {
            limpezas.forEach((fn) => fn && fn());
            splits.forEach((s) => s.revert());
          };
        }
      );

      return () => {
        mm.revert();
        spine.kill();
        alive.kill();
        avulsos.forEach((t) => t.kill());
        document.documentElement.removeAttribute("data-nav-theme");
      };
    },
    { scope: root }
  );

  return (
    <div className="story" ref={root}>
      {rich && (
        <>
          {/* Atrás das seções: luz e véu. */}
          <div className="story__scene story__scene--back" aria-hidden="true">
            <div
              className="story__rays"
              ref={raysBox}
              style={{ opacity: sections[0].rays ? 1 : 0.04 }}
            >
              <Rays level={level} warm />
            </div>
            <div className="story__veil" />
          </div>

          {/* À frente: o bege é opaco e engoliria o modelo. As poses o mantêm
              fora da coluna de texto, então ele nunca disputa legibilidade. */}
          <div className="story__scene story__scene--front" aria-hidden="true">
            <Suspense fallback={null}>
              <LaptopScene active={active} />
            </Suspense>
          </div>
        </>
      )}

      {sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   ASSINATURAS
   Cada função abaixo é a experiência própria de uma seção. Todas devolvem
   uma limpeza — ScrollTriggers e listeners que sobrevivem a um breakpoint
   viram vazamento e brigam com os novos.
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Emenda entre seções: a de fundo bege chega encolhida e com canto
 * arredondado, e assenta ao encostar no topo. Lê-se como a próxima seção
 * deslizando POR CIMA da anterior, e não como um corte.
 */
function transicaoEntreSecoes(q, desktop) {
  if (!desktop) return null;
  const tweens = [];

  sections.forEach((s, i) => {
    if (s.theme !== "bone") return;
    // A de entregas é pinada: o ScrollTrigger já é dono do transform dela,
    // e escalar por cima faria os dois brigarem pelo mesmo canal.
    if (s.layout === "deliverables") return;
    const [el] = q(`[data-sec="${s.id}"]`);
    if (!el) return;

    tweens.push(
      gsap.fromTo(
        el,
        { scale: 0.93, borderRadius: "2.75rem" },
        {
          scale: 1,
          borderRadius: "0rem",
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: 0.5 },
        }
      )
    );

    /* A seção anterior recua e escurece enquanto é coberta: é o que dá a
       impressão de uma passar por baixo da outra. */
    const anterior = sections[i - 1];
    if (!anterior) return;
    const [prev] = q(`[data-sec="${anterior.id}"]`);
    if (!prev) return;

    tweens.push(
      gsap.fromTo(
        prev,
        { scale: 1, filter: "brightness(1)" },
        {
          scale: 0.97,
          filter: "brightness(0.55)",
          ease: "none",
          scrollTrigger: { trigger: el, start: "top bottom", end: "top top", scrub: 0.5 },
        }
      )
    );
  });

  return () => tweens.forEach((t) => t.scrollTrigger?.kill());
}

/**
 * Serviços: a lista reage ao ponteiro. O item apontado se abre, os outros
 * recuam, e a marca em traço correspondente segue o cursor com atraso.
 *
 * O atraso é o ponto: preview colada no mouse parece um tooltip, preview
 * perseguindo o mouse parece intenção.
 */
function servicosInterativos(q, desktop) {
  const [lista] = q("[data-services]");
  const [preview] = q("[data-services-preview]");
  if (!lista || !preview || !desktop || isTouch()) return null;

  const itens = [...lista.querySelectorAll("[data-service]")];
  let x = 0;
  let y = 0;
  let ativo = null;

  gsap.set(preview, { autoAlpha: 0, scale: 0.8 });
  const setX = gsap.quickSetter(preview, "x", "px");
  const setY = gsap.quickSetter(preview, "y", "px");

  const tick = (_t, dt) => {
    if (!pointer.active) return;
    const s = dt / 1000;
    x = damp(x, pointer.x, 0.12, s);
    y = damp(y, pointer.y, 0.12, s);
    setX(x);
    setY(y);
  };
  gsap.ticker.add(tick);

  const entrar = (li) => {
    ativo = li;
    lista.dataset.hovering = "true";
    itens.forEach((el) => (el.dataset.active = String(el === li)));

    const chave = li.dataset.service;
    preview.querySelectorAll("[data-preview]").forEach((m) => {
      gsap.to(m, {
        autoAlpha: m.dataset.preview === chave ? 1 : 0,
        duration: DUR.micro,
        ease: EASE.out,
      });
    });
    gsap.to(preview, { autoAlpha: 1, scale: 1, duration: DUR.ui, ease: EASE.out });
  };

  const sair = () => {
    ativo = null;
    delete lista.dataset.hovering;
    itens.forEach((el) => (el.dataset.active = "false"));
    gsap.to(preview, { autoAlpha: 0, scale: 0.8, duration: DUR.ui, ease: EASE.out });
  };

  const onOver = (e) => {
    const li = e.target.closest("[data-service]");
    if (li && li !== ativo) entrar(li);
  };
  const onLeave = () => sair();

  lista.addEventListener("pointerover", onOver);
  lista.addEventListener("pointerleave", onLeave);

  return () => {
    gsap.ticker.remove(tick);
    lista.removeEventListener("pointerover", onOver);
    lista.removeEventListener("pointerleave", onLeave);
    sair();
  };
}

/**
 * Processo: a coluna da esquerda fica presa (CSS sticky) enquanto as etapas
 * passam. Cada etapa acende ao chegar na faixa de leitura e o contador
 * acompanha — o leitor atravessa o processo em vez de ler a lista dele.
 */
function processoPreso(q) {
  const [contador] = q("[data-process-current]");
  const passos = q("[data-step]");
  if (!passos.length) return null;

  const triggers = passos.map((passo) =>
    ScrollTrigger.create({
      trigger: passo,
      start: "top 62%",
      end: "bottom 42%",
      onToggle: (self) => {
        passo.dataset.active = String(self.isActive);
        if (self.isActive && contador) {
          contador.textContent = String(Number(passo.dataset.step) + 1).padStart(2, "0");
        }
      },
    })
  );

  return () => triggers.forEach((t) => t.kill());
}

/**
 * Entregas: a seção prende e o scroll vertical vira deslocamento lateral.
 * É o único ponto da página em que o eixo do movimento muda, e é por isso
 * que ele funciona como segundo grande momento.
 *
 * No mobile o trilho vira pilha vertical pelo CSS: prender e girar o eixo
 * num aparelho de toque briga com o gesto natural de rolar.
 */
function trilhoHorizontal(q, desktop) {
  const [trilho] = q("[data-rail]");
  const [faixa] = q("[data-rail-track]");
  if (!trilho || !faixa || !desktop) return null;

  const secao = trilho.closest(".sec");
  const curso = () => Math.max(0, faixa.scrollWidth - trilho.clientWidth);

  const tween = gsap.to(faixa, {
    x: () => -curso(),
    ease: "none",
    scrollTrigger: {
      trigger: secao,
      start: "top top",
      // O curso de scroll acompanha a largura real do trilho: com mais
      // entregas, a faixa fica mais longa e a seção prende por mais tempo.
      end: () => `+=${curso() + window.innerHeight * 0.4}`,
      pin: true,
      scrub: 0.5,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  return () => tween.scrollTrigger?.kill();
}

/**
 * Manifesto: a frase cresce e ganha nitidez conduzida pelo scroll. Sem blur
 * aqui — é um bloco de texto grande, e desfocar uma área dessas a cada quadro
 * custa raster caro demais para o que entrega.
 */
function manifestoCinematografico(q) {
  const [sec] = q('[data-sec="manifesto"]');
  const [inner] = q('[data-sec="manifesto"] .sec__inner');
  if (!sec || !inner) return null;

  const tween = gsap.fromTo(
    inner,
    { scale: 0.9, yPercent: 6 },
    {
      scale: 1,
      yPercent: 0,
      ease: "none",
      scrollTrigger: { trigger: sec, start: "top bottom", end: "center center", scrub: 0.7 },
    }
  );

  return () => tween.scrollTrigger?.kill();
}

/**
 * CTA: o fecho. Cresce, ganha foco e acende um brilho por trás, tudo
 * conduzido pelo scroll. Aqui o blur se paga — é um bloco centralizado e
 * pequeno, e é o último momento da página.
 */
function ctaCinematografico(q, desktop) {
  const [sec] = q('[data-sec="contato"]');
  const [inner] = q('[data-sec="contato"] .sec__inner');
  const [brilho] = q("[data-cta-glow]");
  if (!sec || !inner) return null;

  const tweens = [
    gsap.fromTo(
      inner,
      { scale: 0.86, filter: desktop ? "blur(8px)" : "blur(0px)" },
      {
        scale: 1,
        filter: "blur(0px)",
        ease: "none",
        scrollTrigger: { trigger: sec, start: "top 85%", end: "center center", scrub: 0.8 },
      }
    ),
  ];

  if (brilho) {
    tweens.push(
      gsap.fromTo(
        brilho,
        { autoAlpha: 0, scale: 0.7 },
        {
          autoAlpha: 1,
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: sec, start: "top 90%", end: "center center", scrub: 0.8 },
        }
      )
    );
  }

  return () => tweens.forEach((t) => t.scrollTrigger?.kill());
}
