import { lazy, Suspense, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, SplitText } from "../lib/gsap";
import { paintGradientAcross, gradientToken } from "../lib/gradientText";
import { cena, FORA } from "../lib/progress";
import { sections, estadosDoSistema } from "../content/story";
import { pickTier } from "../lib/media";
import { EASE, DUR, STAGGER, BEAT, DEPTH } from "../lib/motion";
import { isTouch } from "../lib/pointer";
import { posicoesDasPecas } from "./SystemScene";
import Section from "./Section";
import Rays from "./Rays";

// three.js sozinho pesa mais que todo o resto do site: sai do caminho da hero.
const LaptopScene = lazy(() => import("./LaptopScene"));

/**
 * A parte da página que vem depois da hero.
 *
 * Camadas, de trás para frente: LUZ (GodRays) → véu → 3D (laptop) → seções.
 * Luz e laptop são sticky e atravessam a narrativa inteira: a cena é contínua
 * e só o conteúdo passa por ela.
 *
 * Cada layout tem UMA interação-assinatura, e nenhuma se repete.
 */
export default function Story() {
  const root = useRef(null);
  const raysBox = useRef(null);
  const laptopBox = useRef(null);

  const [active, setActive] = useState(false);
  // Quantizado por seção: o shader só re-renderiza nas trocas.
  const [level, setLevel] = useState(sections[0].rays ? 1 : 0.05);
  // Aparelho fraco não ganha nem shader fullscreen nem WebGL de modelo.
  const [rich] = useState(() => pickTier() !== "static");

  useGSAP(
    () => {
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      /* Espinha dorsal: um trigger só para a região inteira alimenta o 3D e
         o nível da luz. Um por seção seria trabalho repetido a cada quadro. */
      const alive = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => setActive(self.isActive),
        onRefresh: (self) => setActive(self.isActive),
      });

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

          /* Seções PRESAS têm coreografia própria: o reveal padrão brigaria
             com o pin pelo transform do mesmo elemento. */
          const presas = new Set(["sistema", "filme"]);

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
            const palavras = tSplit?.words || [];
            const linhas = bSplit?.lines || [];

            if (reduce) {
              gsap.set([...label, ...palavras, ...linhas, ...items], {
                autoAlpha: 1,
                y: 0,
                yPercent: 0,
                rotateX: 0,
                scale: 1,
                filter: "blur(0px)",
              });
              gsap.set([...hair, ...rules], { scaleY: 1, scaleX: 1 });
              return;
            }

            gsap.set(label, { autoAlpha: 0, y: 16 });
            gsap.set(hair, { scaleY: 0 });
            gsap.set(rules, { scaleX: 0 });
            gsap.set(palavras, { yPercent: 112, rotateX: -38, autoAlpha: 0 });
            gsap.set(linhas, { autoAlpha: 0, y: 22, filter: desktop ? "blur(6px)" : "none" });
            gsap.set(items, { autoAlpha: 0, y: 34 });

            /* Conduzidas pelo scroll onde o leitor deve sentir controle; por
               tempo onde ele precisa ler em paz. Texto que treme enquanto se
               lê é desconforto, não sofisticação. */
            const conduzida = layout === "diagnostico" || layout === "cta";

            const gatilho = presas.has(layout)
              ? { trigger: sec, start: "top 80%", once: true }
              : conduzida
                ? { trigger: sec, start: "top 88%", end: "top 34%", scrub: 0.6 }
                : { trigger: sec, start: "top 74%", once: true };

            const tl = gsap.timeline({ defaults: { ease: EASE.out }, scrollTrigger: gatilho });

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
              .to(rules, { scaleX: 1, duration: 0.9, stagger: STAGGER.items }, BEAT.items);

            montarParallax(sel);
          });

          /* ═══ Assinaturas ══════════════════════════════════════════════ */
          if (reduce) {
            // Sem movimento: a cena do sistema nasce montada, no estado final.
            sistemaEstatico(q);
          } else {
            limpezas.push(
              transicaoEntreSecoes(q, desktop),
              faixaDoDiagnostico(q),
              frentesInterativas(q, desktop),
              filmeQueCresce(q, desktop),
              cenaDoSistema(q, desktop),
              ctaCinematografico(q, desktop)
            );

            if (raysBox.current) {
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
          }

          /* Criados DEPOIS das assinaturas, e não antes: os pins mudam a
             altura do documento, e um trigger nascido antes deles guarda a
             posição de um layout que deixou de existir. Na prática, a cena
             ficava adiantada em uma seção inteira a partir do primeiro pin.

             Um trigger por seção decide TUDO que depende de "qual seção está em
             cena": pose do 3D, intensidade da luz e tema da barra.
             Três conjuntos separados refariam a mesma conta três vezes — e, o que
             é pior, poderiam discordar entre si perto das emendas. */
          const avulsos = sections.map((s, i) => {
            const proxima = sections[i + 1];
            return ScrollTrigger.create({
              trigger: `[data-sec="${s.id}"]`,
              start: "top 60%",
              /* A faixa termina onde a PRÓXIMA começa, e não na base desta.
                 Com `bottom 40%`, uma seção presa por três telas sai da própria
                 faixa logo no início do pin: dali até a seção seguinte não há
                 nenhuma ativa, e a cena congela no estado da anterior.
                 Amarrar no elemento seguinte também imuniza contra o pin, porque
                 a posição dele já vem calculada com o espaçador. */
              endTrigger: proxima ? `[data-sec="${proxima.id}"]` : `[data-sec="${s.id}"]`,
              end: proxima ? "top 60%" : "bottom bottom",
              onToggle: (self) => {
                if (!self.isActive) return;

                cena.pose = s.laptop || FORA;
            /* Continua "oculto" mesmo quando vai reaparecer: enquanto a
               bandeira está de pé o modelo assume a pose de uma vez, e a
               tween abaixo só o acende depois de ele já estar no lugar.
               Sem isso ele reaparece a meio caminho, cruzando a tela. */
            cena.oculto = true;
                setLevel(s.rays ? 1 : 0.05);

                /* Seção com palco próprio APAGA o modelo em vez de mandá-lo para
                   fora da tela: deslizar leva tempo, e no meio do caminho ele
                   atravessa a composição que deveria estar sozinha em cena. */
                if (laptopBox.current) {
                  gsap.to(laptopBox.current, {
                    autoAlpha: s.laptop ? 1 : 0,
                    duration: s.laptop ? 0.8 : 0.45,
                    ease: EASE.out,
                    overwrite: "auto",
                  });
                }

                /* Mexer no `level` do shader não basta: com `mix-blend-mode:
                   screen` sobre preto, mesmo intensidade baixa continua
                   aparecendo. Quem apaga de verdade é a opacidade. */
                if (raysBox.current) {
                  gsap.to(raysBox.current, {
                    opacity: s.rays ? 1 : 0.04,
                    duration: 1.4,
                    ease: EASE.inOut,
                    overwrite: "auto",
                  });
                }

              },
            });
          });

          /* O tema da barra é decisão à parte: ele tem de virar quando o bege
             chega DEBAIXO dela, não quando a seção entra em cena. */
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


          /* Os pins mudam a altura do documento DEPOIS que os triggers de
             reveal calcularam as próprias posições. Sem recalcular no fim da
             montagem, seções inteiras chegam ao topo ainda escondidas. */
          const recalcular = requestAnimationFrame(() => ScrollTrigger.refresh());

          return () => {
            cancelAnimationFrame(recalcular);
            avulsos.forEach((t) => t.kill());
            limpezas.forEach((fn) => fn && fn());
            splits.forEach((s) => s.revert());
          };
        }
      );

      return () => {
        mm.revert();
        alive.kill();
        document.documentElement.removeAttribute("data-nav-theme");
      };
    },
    { scope: root }
  );

  return (
    <div className="story" ref={root}>
      {rich && (
        <>
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

          <div className="story__scene story__scene--front" ref={laptopBox} aria-hidden="true">
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
   Cada função abaixo é a experiência de uma seção. Todas devolvem uma
   limpeza: ScrollTriggers e listeners que sobrevivem a um breakpoint viram
   vazamento e brigam com os novos.
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

    const anterior = sections[i - 1];
    const [prev] = anterior ? q(`[data-sec="${anterior.id}"]`) : [];
    // Seção presa não entra: o ScrollTrigger já é dono do transform dela.
    if (!prev || anterior.layout === "sistema" || anterior.layout === "filme") return;

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

/** A faixa do diagnóstico corre com o scroll: a palavra vira textura. */
function faixaDoDiagnostico(q) {
  const [fita] = q("[data-faixa-fita]");
  if (!fita) return null;

  const tween = gsap.fromTo(
    fita,
    { xPercent: 0 },
    {
      // Metade, porque a fita repete o conteúdo: assim a emenda não aparece.
      xPercent: -50,
      ease: "none",
      scrollTrigger: {
        trigger: fita.closest(".sec"),
        start: "top bottom",
        end: "bottom top",
        scrub: 0.8,
      },
    }
  );

  return () => tween.scrollTrigger?.kill();
}

/**
 * Serviços: apontar (ou rolar até) uma frente troca a composição do palco e
 * abre as entregas dela. No desktop quem manda é o ponteiro; no toque, o
 * scroll — porque hover não existe lá.
 */
function frentesInterativas(q, desktop) {
  const [grupo] = q("[data-frentes]");
  if (!grupo) return null;

  const itens = [...grupo.querySelectorAll("[data-frente]")];
  const palcos = [...grupo.querySelectorAll("[data-palco]")];
  if (!itens.length) return null;

  let atual = -1;

  const ativar = (i) => {
    if (i === atual || i < 0) return;
    atual = i;
    const chave = itens[i]?.dataset.frente;
    itens.forEach((el, k) => (el.dataset.active = String(k === i)));
    palcos.forEach((p) => (p.dataset.active = String(p.dataset.palco === chave)));
    grupo.dataset.ativa = chave || "";
  };

  ativar(0);

  const limpezas = [];

  if (desktop && !isTouch()) {
    const onOver = (e) => {
      const li = e.target.closest("[data-frente]");
      if (li) ativar(Number(li.dataset.indice));
    };
    // Teclado é a mesma porta: a lista precisa funcionar sem mouse nenhum.
    const onFocus = (e) => {
      const li = e.target.closest("[data-frente]");
      if (li) ativar(Number(li.dataset.indice));
    };
    grupo.addEventListener("pointerover", onOver);
    grupo.addEventListener("focusin", onFocus);
    limpezas.push(() => {
      grupo.removeEventListener("pointerover", onOver);
      grupo.removeEventListener("focusin", onFocus);
    });
  } else {
    // No toque, a frente ativa é a que está sendo lida.
    itens.forEach((li, i) => {
      const st = ScrollTrigger.create({
        trigger: li,
        start: "top 62%",
        end: "bottom 46%",
        onToggle: (self) => self.isActive && ativar(i),
      });
      limpezas.push(() => st.kill());
    });
  }

  return () => limpezas.forEach((fn) => fn());
}

/**
 * Audiovisual: o vídeo começa como peça no meio da página e toma a tela,
 * conduzido pelo scroll.
 *
 * A abertura é `clip-path`, e não `width`: animar largura re-layouta a página
 * a cada quadro. O texto sai antes de o vídeo chegar à borda, para os dois
 * não disputarem a mesma área.
 */
function filmeQueCresce(q, desktop) {
  const [filme] = q("[data-filme]");
  const [janela] = q("[data-filme-janela]");
  const [texto] = q("[data-filme-texto]");
  const [video] = q("[data-filme-video]");
  if (!filme || !janela) return null;

  const sec = filme.closest(".sec");
  /* Fechado, o vídeo ocupa a METADE DIREITA — centralizado, ele nasceria em
     cima do título. A esquerda só é tomada depois que o texto sai. */
  const fechado = desktop
    ? "inset(16% 6% 16% 48% round 24px)"
    : "inset(6% 7% 22% 7% round 18px)";

  gsap.set(janela, { clipPath: fechado });

  // React seta a propriedade `muted` mas não o atributo — e o iOS lê os dois.
  if (video) {
    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute("muted", "");
  }

  const tocar = (ligar) => {
    if (!video) return;
    if (ligar) video.play().catch(() => {});
    else video.pause();
  };

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: sec,
      start: "top top",
      end: () => `+=${window.innerHeight * 1.6}`,
      pin: true,
      scrub: 0.6,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      /* O play/pause vive AQUI, no mesmo trigger do pin. Num trigger próprio
         com `end: "bottom top"`, a conta usaria a geometria do elemento já
         pinado — que encosta no topo logo no início do pin — e o vídeo
         pausava assim que começava a crescer.
         Bônus: fora de cena ele não decodifica, que é bateria de graça. */
      onToggle: (self) => tocar(self.isActive),
    },
  });

  tl.to(texto, { autoAlpha: 0, y: -40, ease: "none", duration: 0.35 }, 0).to(
    janela,
    { clipPath: "inset(0% 0% 0% 0% round 0px)", ease: "none", duration: 1 },
    0
  );

  return () => {
    tl.scrollTrigger?.kill();
    video?.pause();
  };
}

/**
 * O sistema: uma composição presa que atravessa quatro estados — bagunça,
 * alinhamento, identidade e sistema fechado em torno da empresa.
 *
 * É a resposta ao "método em quatro cards": o leitor não lê as etapas, ele vê
 * a comunicação se organizando enquanto rola.
 */
function cenaDoSistema(q, desktop) {
  const [cena] = q("[data-sistema]");
  if (!cena) return null;

  const sec = cena.closest(".sec");
  const nos = posicoesDasPecas()
    .map((p) => ({ p, el: cena.querySelector(`[data-peca="${p.id}"]`) }))
    .filter((n) => n.el);
  if (!nos.length) return null;

  const conexoes = [...cena.querySelectorAll("[data-conexao]")];
  const centro = cena.querySelector("[data-centro]");
  const estados = [...cena.querySelectorAll("[data-estado]")];
  const contador = cena.querySelector("[data-sistema-atual]");

  const origem = "72px 26px"; // meio da peça: gira e escala no próprio lugar
  const alvos = nos.map((n) => n.el);

  nos.forEach((n) =>
    gsap.set(n.el, {
      x: n.p.solto.x,
      y: n.p.solto.y,
      rotation: n.p.solto.r,
      scale: n.p.solto.s,
      transformOrigin: origem,
    })
  );
  gsap.set(conexoes, { drawSVG: "0% 0%" });
  gsap.set(centro, { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%" });
  gsap.set(estados, { autoAlpha: 0, y: 18 });
  gsap.set(estados[0], { autoAlpha: 1, y: 0 });

  let estadoAtual = 0;
  const trocarEstado = (i) => {
    if (i === estadoAtual) return;
    estadoAtual = i;
    estados.forEach((el, k) => {
      gsap.to(el, {
        autoAlpha: k === i ? 1 : 0,
        y: k === i ? 0 : 18,
        duration: DUR.ui,
        ease: EASE.out,
        overwrite: "auto",
      });
    });
    if (contador) contador.textContent = String(i + 1).padStart(2, "0");
  };

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: sec,
      start: "top top",
      // Quatro estados precisam de curso para respirar.
      end: () => `+=${window.innerHeight * (desktop ? 3.4 : 2.6)}`,
      pin: true,
      scrub: 0.7,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const total = estadosDoSistema.length;
        trocarEstado(Math.min(total - 1, Math.floor(self.progress * total)));
      },
    },
  });

  // 1 → 2: a bagunça se alinha. Escalonado, para não virar um estalo só.
  tl.to(
    alvos,
    {
      x: (i) => nos[i].p.grade.x,
      y: (i) => nos[i].p.grade.y,
      rotation: 0,
      scale: 1,
      duration: 1,
      stagger: { each: 0.04, from: "random" },
    },
    0
  );

  // 2 → 3: a marca entra e o grid se aperta em torno dela.
  tl.to(
    alvos,
    {
      x: (i) => nos[i].p.identidade.x,
      y: (i) => nos[i].p.identidade.y,
      scale: (i) => nos[i].p.identidade.s,
      duration: 0.8,
      stagger: 0.02,
    },
    1.15
  )
    .to(cena, { "--marca": 1, duration: 0.6 }, 1.2);

  /* O centro entra junto com a abertura do anel, e não no estado da marca.
     Antes, ele nascia por cima do grid ainda fechado — e, no mobile, onde o
     palco é estreito, isso virava colisão. Também é mais fiel à narrativa: o
     que a identidade acende são as peças; a empresa no meio é o passo
     seguinte. */
  tl.to(centro, { autoAlpha: 1, scale: 1, duration: 0.7, ease: EASE.out }, 2.05);

  // 3 → 4: as peças abrem em anel e as conexões são desenhadas.
  tl.to(
    alvos,
    {
      x: (i) => nos[i].p.orbita.x,
      y: (i) => nos[i].p.orbita.y,
      scale: (i) => nos[i].p.orbita.s,
      duration: 1,
      stagger: { each: 0.03, from: "start" },
    },
    2.2
  ).to(conexoes, { drawSVG: "0% 100%", duration: 0.9, stagger: 0.04 }, 2.5);

  return () => tl.scrollTrigger?.kill();
}

/** Sem movimento: a cena nasce montada, no estado final. */
function sistemaEstatico(q) {
  const [cena] = q("[data-sistema]");
  if (!cena) return;

  posicoesDasPecas().forEach((p) => {
    const el = cena.querySelector(`[data-peca="${p.id}"]`);
    if (!el) return;
    gsap.set(el, {
      x: p.orbita.x,
      y: p.orbita.y,
      rotation: 0,
      scale: p.orbita.s,
      transformOrigin: "72px 26px",
    });
  });

  gsap.set(cena.querySelectorAll("[data-conexao]"), { drawSVG: "0% 100%" });
  gsap.set(cena.querySelector("[data-centro]"), { autoAlpha: 1, scale: 1 });
  gsap.set(cena, { "--marca": 1 });

  const estados = [...cena.querySelectorAll("[data-estado]")];
  gsap.set(estados, { autoAlpha: 0 });
  gsap.set(estados[estados.length - 1], { autoAlpha: 1 });
}

/**
 * CTA: o fecho. Cresce, ganha foco e acende um brilho por trás, conduzido
 * pelo scroll. Aqui o blur se paga — é um bloco pequeno e é o último momento.
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
