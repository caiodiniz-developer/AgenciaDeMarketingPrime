import { lazy, Suspense, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, SplitText, Flip } from "../lib/gsap";
import { paintGradientAcross, gradientToken } from "../lib/gradientText";
import { cena, FORA } from "../lib/progress";
import { sections } from "../content/story";
import { pickTier } from "../lib/media";
import { EASE, DUR, STAGGER, BEAT, DEPTH } from "../lib/motion";
import { isTouch } from "../lib/pointer";
import Section from "./Section";
import Rays from "./Rays";

// three.js sozinho pesa mais que todo o resto do site: sai do caminho da hero.
const LaptopScene = lazy(() => import("./LaptopScene"));

/** Seções que PRENDEM a tela. O reveal padrão não se aplica a elas. */
const PRESAS = new Set(["social", "web", "design", "branding", "estrategia", "maquina"]);

/**
 * A parte da página que vem depois da hero.
 *
 * Camadas, de trás para frente: LUZ (GodRays) → véu → 3D (notebook) → seções.
 * Luz e notebook são sticky e atravessam a narrativa inteira: a cena é
 * contínua e só o conteúdo passa por ela.
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
        onToggle: (self) => {
          setActive(self.isActive);
          cena.ativo = self.isActive;
        },
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

          sections.forEach(({ id, theme, layout }) => {
            const sel = `[data-sec="${id}"]`;
            const [sec] = q(sel);
            const [titleEl] = q(`${sel} [data-sec-title]`);
            const [bodyEl] = q(`${sel} [data-sec-body]`);

            const tSplit = dividir(titleEl, theme);

            /* O parágrafo do manifesto pertence a `palavrasAcendendo`.
               Dividi-lo aqui também poria dois SplitText no mesmo nó, e o
               segundo passaria a fatiar o DOM que o primeiro já reescreveu. */
            const corpoProprio = layout === "manifesto" && !reduce;
            const bSplit =
              bodyEl && !corpoProprio && new SplitText(bodyEl, { type: "words,lines" });
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
            const conduzida = layout === "manifesto" || layout === "cta";

            const gatilho = PRESAS.has(layout)
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
            estadoFinalSemMovimento(q);
          } else {
            /* Ordem importa: as assinaturas que PRENDEM seções vêm primeiro.
               Cada pin acrescenta telas de altura ao documento e empurra para
               baixo tudo que vem depois. Um trigger criado antes disso guarda
               a posição de um layout que deixou de existir. */
            limpezas.push(
              feedSeMontando(q, desktop),
              entrarNaTela(q, desktop),
              interfaceViraEditorial(q, desktop),
              marcaSendoConstruida(q, desktop),
              sistemaConvergindo(q, desktop),
              maquinaPrime(q, desktop)
            );

            limpezas.push(
              caminhoDoNotebook(),
              transicaoEntreSecoes(q, desktop),
              faixaDoManifesto(q),
              palavrasAcendendo(q),
              indiceInterativo(q, desktop),
              forcasDoSistema(q, desktop),
              clientesNoArco(q, desktop),
              cartoesComInclinacao(q, desktop),
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

          /* Criados DEPOIS das assinaturas: os pins mudam a altura do
             documento, e um trigger nascido antes deles guarda a posição de um
             layout que deixou de existir.

             Um trigger por seção decide TUDO que depende de "qual seção está
             em cena": canal da tela, intensidade da luz e tema da barra. Três
             conjuntos separados refariam a mesma conta três vezes — e, pior,
             poderiam discordar entre si perto das emendas.

             A POSE DO NOTEBOOK NÃO ESTÁ AQUI: ela é contínua, conduzida por
             `caminhoDoNotebook`. Fixá-la por seção era o que obrigava a
             apagar o objeto para ele saltar de um lado a outro sem ser visto. */
          const avulsos = sections.map((s, i) => {
            const proxima = sections[i + 1];
            return ScrollTrigger.create({
              trigger: `[data-sec="${s.id}"]`,
              start: "top 60%",
              /* A faixa termina onde a PRÓXIMA começa, e não na base desta.
                 Com `bottom 40%`, uma seção presa por três telas sai da
                 própria faixa logo no início do pin: dali até a seção seguinte
                 não há nenhuma ativa, e a cena congela no estado da anterior.
                 Amarrar no elemento seguinte também imuniza contra o pin. */
              endTrigger: proxima ? `[data-sec="${proxima.id}"]` : `[data-sec="${s.id}"]`,
              end: proxima ? "top 60%" : "bottom bottom",
              onToggle: (self) => {
                if (!self.isActive) return;

                if (s.canal) cena.canal = s.canal;
                setLevel(s.rays ? 1 : 0.05);

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
             chega DEBAIXO dela, não quando a seção entra em cena.

             UM CONJUNTO, e não um atributo por gatilho. Cada seção bege tinha
             o próprio trigger escrevendo `data-nav-theme` no `onToggle` — que
             dispara tanto ao ENTRAR quanto ao SAIR. Bastava a segunda seção
             bege reportar "saí" enquanto a primeira estava em cena para a
             barra voltar a preto por cima do bege, e os links sumirem. */
          const beges = new Set();
          const aplicarTema = () =>
            document.documentElement.setAttribute(
              "data-nav-theme",
              beges.size ? "bone" : "ink"
            );

          /* O alvo é o ESPAÇADOR do pin quando ele existe.
             Uma seção presa não fica mais onde o layout diz: enquanto o pin
             está ativo ela é retirada do fluxo, e depois dele o ScrollTrigger
             a desloca até o fim do espaçador. Medir a seção em si dava uma
             posição que nunca correspondia ao que o leitor vê — e o gatilho
             do tema simplesmente nunca disparava na seção bege presa. O
             espaçador, esse sim, ocupa exatamente o curso da seção. */
          const ancora = (id) => {
            const el = root.current?.querySelector(`[data-sec="${id}"]`);
            return el?.closest(".pin-spacer") || el;
          };

          sections
            .filter((s) => s.theme === "bone")
            .forEach((s) => {
              const i = sections.indexOf(s);
              const proxima = sections[i + 1];
              const alvo = ancora(s.id);
              const alvoProximo = proxima && ancora(proxima.id);
              if (!alvo) return;
              avulsos.push(
                ScrollTrigger.create({
                  trigger: alvo,
                  start: "top 12%",
                  endTrigger: alvoProximo || alvo,
                  end: alvoProximo ? "top 12%" : "bottom 12%",
                  onToggle: (self) => {
                    if (self.isActive) beges.add(s.id);
                    else beges.delete(s.id);
                    aplicarTema();
                  },
                })
              );
            });

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
 * O CAMINHO DO NOTEBOOK.
 *
 * Uma tween com scrub por seção, cada uma partindo exatamente de onde a
 * anterior parou. O resultado é um trajeto ÚNICO e contínuo: o objeto entra
 * pela direita, cruza até o centro na seção Web, sai pela esquerda e volta
 * para o fecho — sempre à vista, nunca apagado no meio do salto.
 *
 * Sair de cena aqui é viajar para fora do quadro (|x| > 1.6), não sumir. Era
 * exatamente o "teletransporte" que o briefing proíbe: antes cada seção fixava
 * uma pose e o modelo era apagado para saltar sem ser visto.
 */
function caminhoDoNotebook() {
  const tweens = [];
  let anterior = { ...FORA };

  sections.forEach((s) => {
    if (!s.laptop) return;
    const de = { ...anterior };

    tweens.push(
      gsap.fromTo(cena.pose, de, {
        ...s.laptop,
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          trigger: `[data-sec="${s.id}"]`,
          /* A viagem acontece ENQUANTO a seção sobe pela tela e termina
             quando ela assume o quadro. Assim o objeto já está posicionado
             quando o texto começa a ser lido. */
          start: "top bottom",
          end: "top 30%",
          scrub: 0.9,
          invalidateOnRefresh: true,
        },
      })
    );

    anterior = s.laptop;
  });

  return () => tweens.forEach((t) => t.scrollTrigger?.kill());
}

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
    if (!prev || PRESAS.has(anterior.layout)) return;

    tweens.push(
      gsap.fromTo(
        prev,
        { scale: 1, filter: "brightness(1)" },
        {
          scale: 0.97,
          filter: "brightness(0.55)",
          ease: "none",
          /* Começa em "top 45%", e não em "top bottom": com o gatilho na base
             da tela, a seção anterior já escurecia enquanto ainda estava
             sendo lida — e um painel branco chegava cinza ao leitor. */
          scrollTrigger: { trigger: el, start: "top 45%", end: "top top", scrub: 0.5 },
        }
      )
    );
  });

  return () => tweens.forEach((t) => t.scrollTrigger?.kill());
}

/**
 * As palavras do manifesto acendem uma a uma, conduzidas pelo scroll.
 *
 * É a única seção com este tratamento, e de propósito: o texto ali É o
 * argumento, e acender palavra a palavra obriga a lê-lo no ritmo em que ele
 * foi escrito. Repetido em outras seções, viraria maneirismo.
 */
function palavrasAcendendo(q) {
  const [corpo] = q('[data-sec="manifesto"] [data-sec-body]');
  if (!corpo) return null;

  const split = new SplitText(corpo, { type: "words", wordsClass: "acende" });
  gsap.set(split.words, { opacity: 0.16 });

  const tween = gsap.to(split.words, {
    opacity: 1,
    ease: "none",
    stagger: 1, // em scrub, o stagger é distância, não tempo
    scrollTrigger: { trigger: corpo, start: "top 82%", end: "bottom 52%", scrub: 0.6 },
  });

  return () => {
    tween.scrollTrigger?.kill();
    split.revert();
  };
}

/** A faixa do manifesto corre com o scroll: a palavra vira textura. */
function faixaDoManifesto(q) {
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
 * O índice das frentes: apontar uma linha troca o vídeo de fundo pelo trabalho
 * real daquela frente. No toque, quem escolhe é o scroll.
 */
function indiceInterativo(q, desktop) {
  const [grupo] = q("[data-indice-frentes]");
  if (!grupo) return null;

  const linhas = [...grupo.querySelectorAll("[data-linha]")];
  const videos = [...grupo.querySelectorAll("[data-indice-video]")];
  if (!linhas.length) return null;

  let atual = -1;
  const limpezas = [];

  const ativar = (i) => {
    if (i === atual || i < 0) return;
    atual = i;
    const chave = linhas[i]?.dataset.linha;

    linhas.forEach((el, k) => (el.dataset.active = String(k === i)));
    grupo.dataset.ativa = chave || "";

    videos.forEach((v) => {
      const ativo = v.dataset.indiceVideo === chave;
      v.dataset.active = String(ativo);
      if (!ativo) {
        v.pause();
        return;
      }
      /* Carrega sob demanda: cinco vídeos baixando de uma vez na entrada da
         seção é dezena de megabytes que ninguém pediu. */
      if (v.preload !== "auto") v.preload = "auto";
      v.play().catch(() => {});
    });
  };

  ativar(0);

  if (desktop && !isTouch()) {
    const onOver = (e) => {
      const li = e.target.closest("[data-linha]");
      if (li) ativar(Number(li.dataset.indice));
    };
    // Teclado é a mesma porta: a lista precisa funcionar sem mouse nenhum.
    grupo.addEventListener("pointerover", onOver);
    grupo.addEventListener("focusin", onOver);
    limpezas.push(() => {
      grupo.removeEventListener("pointerover", onOver);
      grupo.removeEventListener("focusin", onOver);
    });
  } else {
    linhas.forEach((li, i) => {
      const st = ScrollTrigger.create({
        trigger: li,
        start: "top 62%",
        end: "bottom 46%",
        onToggle: (self) => self.isActive && ativar(i),
      });
      limpezas.push(() => st.kill());
    });
  }

  /* Fora de cena, nada decodifica. */
  const emCena = ScrollTrigger.create({
    trigger: grupo.closest(".sec"),
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      if (self.isActive) videos.find((v) => v.dataset.active === "true")?.play().catch(() => {});
      else videos.forEach((v) => v.pause());
    },
  });
  limpezas.push(() => emCena.kill());

  return () => {
    limpezas.forEach((fn) => fn());
    videos.forEach((v) => v.pause());
  };
}

/**
 * Liga e desliga os vídeos de fundo de uma seção conforme ela entra e sai.
 * Repetido em quase toda frente, então mora em um lugar só.
 */
function videoNaCena(sec) {
  const videos = [...sec.querySelectorAll("[data-frente-video], [data-peca-video]")];
  videos.forEach((v) => {
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
  });

  const st = ScrollTrigger.create({
    trigger: sec,
    start: "top bottom",
    end: "bottom top",
    onToggle: (self) => {
      videos.forEach((v) => {
        if (!self.isActive) {
          v.pause();
          return;
        }
        if (v.preload !== "auto") v.preload = "auto";
        v.play().catch(() => {});
      });
    },
  });

  return () => {
    st.kill();
    videos.forEach((v) => v.pause());
  };
}

/**
 * SOCIAL — o feed se montando.
 *
 * Três estados, conduzidos pelo scroll numa seção presa:
 *
 *   solto    → as peças chegam espalhadas e tortas, como conteúdo sem plano
 *   feed     → o Flip as reorganiza numa grade de perfil
 *   entrando → a grade encolhe e viaja na direção do notebook
 *
 * O terceiro estado é a emenda com a próxima seção: o feed literalmente entra
 * na tela do objeto que, um instante depois, é o assunto de WEB. É o "cada
 * serviço planta o próximo" pedido no briefing, dito por movimento.
 *
 * O Flip é disparado em travessias de progresso, e não amarrado ao scrub:
 * `Flip.from` cria a própria tween, e duas fontes escrevendo no mesmo
 * transform brigam a cada quadro.
 */
function feedSeMontando(q, desktop) {
  const [palco] = q("[data-social-palco]");
  if (!palco) return null;

  const sec = palco.closest(".sec");
  const pecas = [...palco.querySelectorAll("[data-flip-id]")];
  const moldura = palco.querySelector("[data-social-moldura]");
  if (!pecas.length) return null;

  const limpezas = [videoNaCena(sec)];
  let estado = "solto";

  const trocar = (novo) => {
    if (novo === estado) return;
    const antes = Flip.getState(pecas, { props: "borderRadius,filter" });
    palco.dataset.estado = novo;
    estado = novo;

    Flip.from(antes, {
      duration: 0.9,
      ease: "power3.inOut",
      absolute: true,
      nested: true,
      overwrite: "auto",
      stagger: 0.035,
    });

    if (moldura) {
      gsap.to(moldura, {
        autoAlpha: novo === "solto" ? 0 : 1,
        duration: 0.6,
        ease: EASE.out,
        overwrite: "auto",
      });
    }
  };

  if (moldura) gsap.set(moldura, { autoAlpha: 0 });

  const st = ScrollTrigger.create({
    trigger: sec,
    start: "top top",
    end: () => `+=${window.innerHeight * (desktop ? 2.6 : 2)}`,
    pin: true,
    scrub: 0.6,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => {
      const p = self.progress;
      trocar(p < 0.3 ? "solto" : p < 0.76 ? "feed" : "entrando");
    },
  });
  limpezas.push(() => st.kill());

  return () => limpezas.forEach((fn) => fn && fn());
}

/**
 * WEB — a câmera entra na tela.
 *
 * A assinatura do site. Numa seção presa, o scroll conduz:
 *
 *   0.00–0.30  os argumentos entram um a um; o notebook já está de frente
 *   0.30–0.62  `cena.zoom` leva o painel a encher a janela e o texto sai
 *   0.55–0.72  a página REAL atravessa por cima, revelada por clip-path
 *   0.72–0.86  o conteúdo rola dentro dela: o scroll da página é o scroll do site
 *   0.86–1.00  a página sai e a câmera recua — senão o objeto entraria
 *              gigante na seção seguinte
 *
 * A aproximação é escrita em `cena.zoom` e não na pose: pose é o objeto
 * andando pelo palco, zoom é a câmera. Somados no mesmo número, um resize no
 * meio da aproximação faria o notebook saltar.
 */
function entrarNaTela(q, desktop) {
  const [web] = q("[data-web]");
  if (!web) return null;

  const sec = web.closest(".sec");
  const texto = web.querySelector("[data-web-texto]");
  const dentro = web.querySelector("[data-web-dentro]");
  const quadro = dentro?.querySelector(".dentro__quadro");
  const razoes = [...web.querySelectorAll("[data-razao]")];
  const entregas = web.querySelector("[data-entregas]");

  const limpezas = [videoNaCena(sec)];

  const fechado = "circle(0% at 50% 50%)";
  const aberto = "circle(78% at 50% 50%)";
  if (dentro) gsap.set(dentro, { clipPath: fechado, autoAlpha: 1 });

  if (razoes.length) {
    gsap.set(razoes, { autoAlpha: 0, y: 22 });
    gsap.set(razoes[0], { autoAlpha: 1, y: 0 });
  }

  let razaoAtual = 0;
  const trocarRazao = (i) => {
    if (i === razaoAtual || !razoes[i]) return;
    razaoAtual = i;
    razoes.forEach((el, k) =>
      gsap.to(el, {
        autoAlpha: k === i ? 1 : 0,
        y: k === i ? 0 : 22,
        duration: DUR.ui,
        ease: EASE.out,
        overwrite: "auto",
      })
    );
  };

  /* O alvo do zoom vive num objeto e é copiado para a cena a cada quadro:
     `cena.zoom` é lido pelo loop de render, e deixar a timeline escrever
     direto nele acopla o 3D à existência desta seção. */
  const estado = { zoom: 0 };

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: sec,
      start: "top top",
      end: () => `+=${window.innerHeight * (desktop ? 4 : 3)}`,
      pin: true,
      scrub: 0.7,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        cena.zoom = estado.zoom;
        // A última fatia pertence à entrada na tela, onde o texto já saiu.
        const p = Math.min(1, self.progress / 0.3);
        trocarRazao(Math.min(razoes.length - 1, Math.floor(p * razoes.length)));
      },
      onLeave: () => (cena.zoom = 0),
      onLeaveBack: () => (cena.zoom = 0),
    },
  });

  // 1 · a câmera entra
  tl.to(estado, { zoom: 1, duration: 0.32 }, 0.3)
    .to(texto, { autoAlpha: 0, y: -40, duration: 0.18 }, 0.3)
    .to(entregas, { autoAlpha: 0, duration: 0.14 }, 0.3);

  // 2 · a página nasce dentro do painel
  if (dentro) tl.to(dentro, { clipPath: aberto, duration: 0.17 }, 0.55);

  // 3 · o scroll da página é o scroll do site
  if (quadro) {
    tl.fromTo(
      quadro,
      { y: 0 },
      { y: () => -Math.max(0, quadro.scrollHeight - window.innerHeight * 0.92), duration: 0.14 },
      0.72
    );
  }

  // 4 · sai de cena e a câmera recua junto
  if (dentro) tl.to(dentro, { autoAlpha: 0, duration: 0.08 }, 0.88);
  tl.to(estado, { zoom: 0, duration: 0.12 }, 0.88)
    .to(texto, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.94);

  limpezas.push(() => {
    tl.scrollTrigger?.kill();
    cena.zoom = 0;
  });

  return () => limpezas.forEach((fn) => fn && fn());
}

/**
 * DESIGN — a interface vira peça gráfica.
 *
 * As peças nascem em fileiras, com a cara da tela que o leitor acabou de
 * atravessar, e o Flip as recompõe como pôsteres numa grade editorial
 * assimétrica. O mesmo conjunto de elementos, outra composição: é a definição
 * de "transformação" em vez de "corte".
 */
function interfaceViraEditorial(q, desktop) {
  const [palco] = q("[data-design-palco]");
  if (!palco) return null;

  const sec = palco.closest(".sec");
  const cartazes = [...palco.querySelectorAll("[data-flip-id]")];
  if (!cartazes.length) return null;

  const limpezas = [videoNaCena(sec)];
  let estado = "interface";

  const trocar = (novo) => {
    if (novo === estado) return;
    const antes = Flip.getState(cartazes, { props: "borderRadius" });
    palco.dataset.estado = novo;
    estado = novo;
    Flip.from(antes, {
      duration: 1,
      ease: "power3.inOut",
      absolute: true,
      nested: true,
      overwrite: "auto",
      stagger: 0.04,
    });
  };

  const st = ScrollTrigger.create({
    trigger: sec,
    start: "top top",
    end: () => `+=${window.innerHeight * (desktop ? 2.4 : 1.8)}`,
    pin: true,
    scrub: 0.6,
    anticipatePin: 1,
    invalidateOnRefresh: true,
    onUpdate: (self) => trocar(self.progress < 0.38 ? "interface" : "editorial"),
  });
  limpezas.push(() => st.kill());

  return () => limpezas.forEach((fn) => fn && fn());
}

/**
 * BRANDING — a marca sendo construída.
 *
 * A ordem é a de um trabalho real de identidade, e cada etapa é desenhada:
 * grade, guias geométricas, símbolo, cotas, tipografia, cor, aplicação.
 * `drawSVG` existe exatamente para isto — uma linha que aparece traçada lê
 * como decisão sendo tomada; a mesma linha com fade-in lê como imagem colada.
 */
function marcaSendoConstruida(q, desktop) {
  const [cena3] = q("[data-branding]");
  if (!cena3) return null;

  const sec = cena3.closest(".sec");
  const linhas = [...cena3.querySelectorAll("[data-bd-linha]")];
  const guias = [...cena3.querySelectorAll("[data-bd-guia]")];
  const traco = cena3.querySelector("[data-bd-traco]");
  const marca = cena3.querySelector("[data-bd-marca]");
  const cotas = [...cena3.querySelectorAll("[data-bd-cota]")];
  const textos = [...cena3.querySelectorAll("[data-bd-texto]")];
  const specs = [...cena3.querySelectorAll("[data-bd-spec]")];
  const cores = [...cena3.querySelectorAll("[data-bd-cor]")];
  const aplicacoes = [...cena3.querySelectorAll("[data-bd-aplicacao]")];

  gsap.set([...linhas, ...guias, ...cotas], { drawSVG: "0%" });
  if (traco) gsap.set(traco, { drawSVG: "0%" });
  /* A marca é REVELADA, não desenhada: ela existe como arte pronta, e fingir
     que está sendo traçada seria mentir sobre o que a peça é. Um círculo
     abrindo do centro lê como "a construção chegou a isto". */
  if (marca) gsap.set(marca, { clipPath: "circle(0% at 50% 50%)", autoAlpha: 1, scale: 0.9 });
  gsap.set(textos, { autoAlpha: 0 });
  gsap.set(specs, { autoAlpha: 0, y: 28 });
  gsap.set(cores, { autoAlpha: 0, x: -14 });
  gsap.set(aplicacoes, { autoAlpha: 0, y: 12 });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: sec,
      start: "top top",
      end: () => `+=${window.innerHeight * (desktop ? 3.2 : 2.4)}`,
      pin: true,
      scrub: 0.7,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  tl.to(linhas, { drawSVG: "100%", duration: 0.6, stagger: 0.012 }, 0)
    .to(guias, { drawSVG: "100%", duration: 0.5, stagger: 0.06 }, 0.5)
    .to(traco, { drawSVG: "100%", duration: 0.8 }, 0.95)
    .to(
      marca,
      { clipPath: "circle(62% at 50% 50%)", scale: 1, duration: 0.5, ease: EASE.out },
      1.55
    )
    // As guias recuam quando o símbolo existe: andaime não fica na entrega.
    .to(guias, { drawSVG: "100% 100%", duration: 0.4 }, 1.7)
    .to(cotas, { drawSVG: "100%", duration: 0.35, stagger: 0.04 }, 1.85)
    .to(textos, { autoAlpha: 1, duration: 0.3, stagger: 0.05 }, 2.0)
    .to(specs[0], { autoAlpha: 1, y: 0, duration: 0.4, ease: EASE.out }, 2.15)
    .to(specs[1], { autoAlpha: 1, y: 0, duration: 0.4, ease: EASE.out }, 2.4)
    .to(cores, { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.06 }, 2.5)
    .to(specs[2], { autoAlpha: 1, y: 0, duration: 0.4, ease: EASE.out }, 2.75)
    .to(aplicacoes, { autoAlpha: 1, y: 0, duration: 0.25, stagger: 0.05 }, 2.85)
    // Pausa: sem ela o clímax acontece no último quadro e some antes de ser lido.
    .to({}, { duration: 0.4 }, 3.2);

  return () => tl.scrollTrigger?.kill();
}

/**
 * ESTRATÉGIA — do emaranhado à direção.
 *
 * Primeiro os pontos, depois a malha que liga tudo com tudo (que é verdadeira
 * e é justamente o problema), e por fim a convergência: as mesmas origens
 * apontando todas para o mesmo lugar. O feixe substitui a malha à vista.
 */
function sistemaConvergindo(q, desktop) {
  const [palco] = q("[data-estrategia-palco]");
  if (!palco) return null;

  const sec = palco.closest(".sec");
  const pontos = [...palco.querySelectorAll("[data-est-ponto]")];
  const malha = [...palco.querySelectorAll("[data-est-malha]")];
  const feixe = [...palco.querySelectorAll("[data-est-feixe]")];
  const rotulos = [...palco.querySelectorAll("[data-est-rotulo]")];
  const foco = palco.querySelector("[data-est-rotulo='foco']");
  const halo = palco.querySelector("[data-est-halo]");
  const nucleo = palco.querySelector("[data-est-nucleo]");
  const seta = palco.querySelector("[data-est-seta]");
  const soltos = rotulos.filter((r) => r !== foco);

  gsap.set(pontos, { autoAlpha: 0, scale: 0, transformOrigin: "50% 50%" });
  gsap.set([...malha, ...feixe], { drawSVG: "0%" });
  gsap.set(soltos, { autoAlpha: 0, y: 10 });
  gsap.set([foco, halo, nucleo], { autoAlpha: 0 });
  if (seta) gsap.set(seta, { drawSVG: "0%" });

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: sec,
      start: "top top",
      end: () => `+=${window.innerHeight * (desktop ? 3 : 2.2)}`,
      pin: true,
      scrub: 0.7,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    },
  });

  tl.to(pontos, { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.05, ease: EASE.out }, 0)
    .to(soltos, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.05 }, 0.15)
    .to(malha, { drawSVG: "100%", duration: 0.7, stagger: 0.05 }, 0.6)
    // A malha some enquanto o feixe nasce: a mesma informação, outra ordem.
    .to(malha, { drawSVG: "100% 100%", duration: 0.5, stagger: 0.03 }, 1.5)
    .to(feixe, { drawSVG: "100%", duration: 0.7, stagger: 0.04 }, 1.6)
    .to([halo, nucleo], { autoAlpha: 1, duration: 0.4, ease: EASE.out }, 2.05)
    .to(seta, { drawSVG: "100%", duration: 0.35 }, 2.2)
    .to(foco, { autoAlpha: 1, duration: 0.35, ease: EASE.out }, 2.3)
    .to({}, { duration: 0.4 }, 2.7);

  const limpar = videoNaCena(sec);
  return () => {
    tl.scrollTrigger?.kill();
    limpar();
  };
}

/**
 * MÁQUINA PRIME — a linha de produção.
 *
 * As fichas de entrada VIAJAM para dentro do núcleo com Flip em vez de sumirem
 * em fade: o leitor precisa ver a matéria-prima ser engolida. Depois as quatro
 * operações se revezam, e as entregas saem do outro lado ao longo da mesma
 * linha dourada que trouxe os insumos.
 */
function maquinaPrime(q, desktop) {
  const [maq] = q("[data-maquina]");
  if (!maq) return null;

  const sec = maq.closest(".sec");
  const cenaEl = maq.querySelector("[data-maquina-cena]");
  const fio = maq.querySelector("[data-maquina-fio]");
  const fichas = [...maq.querySelectorAll("[data-maquina-ficha]")];
  const nucleo = maq.querySelector("[data-maquina-nucleo]");
  const etapas = [...maq.querySelectorAll("[data-maquina-etapa]")];
  const saidas = [...maq.querySelectorAll("[data-maquina-saida]")];
  const fecho = maq.querySelector("[data-maquina-fecho]");
  const aneis = [...maq.querySelectorAll(".maquina__anel")];

  if (fio) gsap.set(fio, { drawSVG: "0%" });
  gsap.set(fichas, { autoAlpha: 0, x: -60 });
  gsap.set(etapas, { autoAlpha: 0, y: 24 });
  gsap.set(saidas, { autoAlpha: 0, x: -30, scale: 0.9 });
  gsap.set(aneis, { autoAlpha: 0, scale: 0.7, transformOrigin: "50% 50%" });
  if (fecho) gsap.set(fecho, { autoAlpha: 0, y: 20 });

  let etapaAtual = -1;
  const mostrarEtapa = (i) => {
    if (i === etapaAtual) return;
    etapaAtual = i;
    etapas.forEach((el, k) =>
      gsap.to(el, {
        autoAlpha: k === i ? 1 : 0,
        y: k === i ? 0 : k < i ? -24 : 24,
        duration: DUR.ui,
        ease: EASE.out,
        overwrite: "auto",
      })
    );
  };

  /* As fichas engolidas: um Flip só, disparado na travessia. Animar quatro
     posições na mão exigiria saber onde o núcleo está — que é exatamente a
     medida que o Flip tira sozinho, antes e depois. */
  let engolidas = false;
  const engolir = (sim) => {
    if (sim === engolidas || !cenaEl) return;
    const antes = Flip.getState(fichas);
    cenaEl.dataset.fase = sim ? "processando" : "entrando";
    engolidas = sim;
    Flip.from(antes, {
      duration: 0.9,
      ease: "power3.inOut",
      absolute: true,
      stagger: 0.05,
      overwrite: "auto",
      onComplete: () => {
        if (sim) gsap.to(fichas, { autoAlpha: 0, scale: 0.7, duration: 0.4, ease: EASE.out });
      },
    });
    if (!sim) gsap.to(fichas, { autoAlpha: 1, scale: 1, duration: 0.4, ease: EASE.out });
  };

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: sec,
      start: "top top",
      end: () => `+=${window.innerHeight * (desktop ? 3.6 : 2.8)}`,
      pin: true,
      scrub: 0.7,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        engolir(p > 0.36);
        if (p < 0.3) mostrarEtapa(-1);
        else mostrarEtapa(Math.min(etapas.length - 1, Math.floor(((p - 0.3) / 0.45) * etapas.length)));
      },
    },
  });

  tl.to(fichas, { autoAlpha: 1, x: 0, duration: 0.5, stagger: 0.08, ease: EASE.out }, 0)
    .to(fio, { drawSVG: "0% 42%", duration: 0.6 }, 0.2)
    .to(aneis, { autoAlpha: 1, scale: 1, duration: 0.5, stagger: 0.1, ease: EASE.out }, 0.7)
    // O anel gira devagar só enquanto a máquina "trabalha".
    .to(aneis[0], { rotate: 90, duration: 2, ease: "none" }, 0.9)
    .to(aneis[1], { rotate: -60, duration: 2, ease: "none" }, 0.9)
    .to(fio, { drawSVG: "0% 100%", duration: 0.8 }, 2.1)
    .to(saidas, { autoAlpha: 1, x: 0, scale: 1, duration: 0.45, stagger: 0.07, ease: EASE.out }, 2.3)
    .to(fecho, { autoAlpha: 1, y: 0, duration: 0.4, ease: EASE.out }, 3)
    .to({}, { duration: 0.4 }, 3.3);

  return () => tl.scrollTrigger?.kill();
}

/* ── POR QUE FUNCIONA ───────────────────────────────────────────────────── */

/**
 * Onde cada peça do palco fica em cada demonstração.
 *
 * As posições são CALCULADAS, e não escritas à mão em CSS, porque o palco é
 * fluido: em 1440px e em 1024px o mesmo layout precisa continuar sendo o mesmo
 * gesto. `i` é o índice da peça, `n` o total.
 */
function posicaoDaPeca(demo, i, n, w, h) {
  const col = i % 4;
  const lin = Math.floor(i / 4);
  const cx = w / 2;
  const cy = h / 2;

  /* Pseudoaleatório determinístico: o mesmo "bagunçado" em todo carregamento.
     Math.random() daria uma composição diferente a cada refresh, e composição
     que muda sozinha lê como bug. */
  const r1 = Math.sin(i * 12.9898) * 43758.5453;
  const r2 = Math.sin(i * 78.233) * 12345.6789;
  const a = r1 - Math.floor(r1);
  const b = r2 - Math.floor(r2);

  const grade = () => ({
    x: 40 + col * (w - 140) / 3,
    y: 34 + lin * (h - 120) / 2,
    rot: 0,
    scale: 1,
    opacity: 1,
  });

  switch (demo) {
    /* CONSISTÊNCIA: o desalinho se resolve. Tudo no mesmo eixo, no mesmo
       tamanho, no mesmo tom. */
    case "alinhar":
      return grade();

    /* ESTRATÉGIA: as peças se inclinam todas para o mesmo alvo — ainda
       espalhadas, mas já apontando para o centro. */
    case "convergir": {
      const ang = (i / n) * Math.PI * 2;
      const raio = Math.min(w, h) * 0.34;
      const x = cx + Math.cos(ang) * raio - 52;
      const y = cy + Math.sin(ang) * raio * 0.72 - 30;
      return { x, y, rot: (ang * 180) / Math.PI + 90, scale: 0.86, opacity: 1 };
    }

    /* QUALIDADE: hierarquia. Uma peça grande manda, três médias apoiam, o
       resto vira detalhe — que é o que separa composição de amontoado. */
    case "refinar": {
      if (i === 0) return { x: 40, y: 34, rot: 0, scale: 2.1, opacity: 1 };
      if (i < 4)
        return {
          x: w * 0.56,
          y: 34 + (i - 1) * (h * 0.2),
          rot: 0,
          scale: 1.12,
          opacity: 1,
        };
      const k = i - 4;
      return {
        x: 40 + (k % 4) * ((w - 140) / 3) * 0.62,
        y: h * 0.68 + Math.floor(k / 4) * 46,
        rot: 0,
        scale: 0.6,
        opacity: 0.7,
      };
    }

    /* FREQUÊNCIA: a grade se preenche em cadência. A posição é a mesma da
       consistência; o que muda é QUANDO cada uma chega — o stagger é o
       conteúdo desta demonstração. */
    case "preencher":
      return grade();

    /* DIREÇÃO: tudo alinhado a um eixo só, em fila, com alguém à frente. */
    case "apontar": {
      /* Uma fila em perspectiva: as peças de trás são menores e mais
         apagadas. A escala pequena no começo é o que impede a fila de virar
         um empilhamento — com todas do mesmo tamanho, o passo disponível é
         menor que a largura da peça e elas se cobrem. */
      const passo = (w - 150) / (n - 1);
      return {
        x: 26 + i * passo,
        y: cy - 26 - (i / n) * 18,
        rot: 0,
        scale: 0.5 + (i / n) * 0.55,
        opacity: 0.35 + (i / n) * 0.65,
      };
    }

    /* REPOUSO: o estado real de quem nunca teve direção. */
    default:
      return {
        x: 20 + a * (w - 130),
        y: 20 + b * (h - 90),
        rot: (a - 0.5) * 34,
        scale: 0.8 + b * 0.45,
        opacity: 0.55 + a * 0.35,
      };
  }
}

/**
 * As cinco forças. Escolher uma reorganiza o palco para DEMONSTRAR o conceito.
 *
 * No desktop quem escolhe é o ponteiro ou o teclado; no toque, o scroll — cada
 * força assume o palco conforme entra na viewport, porque hover não existe lá.
 */
function forcasDoSistema(q, desktop) {
  const [palco] = q("[data-palco]");
  const [lista] = q("[data-forcas]");
  if (!palco || !lista) return null;

  const pecas = [...palco.querySelectorAll("[data-palco-peca]")];
  const itens = [...lista.querySelectorAll("[data-forca]")];
  const marca = palco.querySelector("[data-palco-marca]");
  const eixo = palco.querySelector("[data-palco-eixo]");
  const seta = palco.querySelector("[data-palco-seta]");
  if (!pecas.length) return null;

  const limpezas = [];
  let atual = "repouso";

  const aplicar = (demo) => {
    if (demo === atual) return;
    atual = demo;
    palco.dataset.demo = demo;

    const w = palco.clientWidth;
    const h = palco.clientHeight;
    const n = pecas.length;

    itens.forEach((li) => (li.dataset.active = String(li.dataset.forca === demo)));

    /* A legenda diz o que a composição está demonstrando. Sem ela, o leitor
       vê peças se mexendo e tem de adivinhar por quê. */
    const legenda = palco.querySelector("[data-palco-legenda]");
    if (legenda) {
      const ativa = itens.find((li) => li.dataset.forca === demo);
      const texto = ativa?.querySelector(".forca__rotulo")?.textContent || "";
      gsap.to(legenda, {
        autoAlpha: 0,
        duration: 0.2,
        onComplete: () => {
          legenda.textContent = texto;
          gsap.to(legenda, { autoAlpha: 1, duration: 0.35, ease: EASE.out });
        },
      });
    }

    pecas.forEach((el, i) => {
      const p = posicaoDaPeca(demo, i, n, w, h);
      gsap.to(el, {
        x: p.x,
        y: p.y,
        rotate: p.rot,
        scale: p.scale,
        autoAlpha: p.opacity,
        duration: demo === "preencher" ? 0.5 : 0.85,
        ease: demo === "preencher" ? EASE.out : "power3.inOut",
        overwrite: "auto",
        /* FREQUÊNCIA é a única em que o stagger É o conteúdo: as peças
           chegam em cadência, uma após a outra, e é isso que se quer ver. */
        delay: demo === "preencher" ? i * 0.075 : 0,
      });
    });

    /* A marca cresce quando a demonstração é sobre o que a sustenta. */
    if (marca) {
      gsap.to(marca, {
        scale: demo === "convergir" || demo === "alinhar" ? 1.12 : 1,
        autoAlpha: demo === "repouso" ? 0.5 : 1,
        duration: 0.7,
        ease: EASE.out,
        overwrite: "auto",
      });
    }

    // O eixo só existe na demonstração de DIREÇÃO.
    const mostrarEixo = demo === "apontar";
    if (eixo) {
      gsap.to(eixo, { autoAlpha: mostrarEixo ? 1 : 0, duration: 0.5, overwrite: "auto" });
    }
    if (seta) {
      gsap.to(seta, {
        drawSVG: mostrarEixo ? "100%" : "0%",
        duration: 0.6,
        ease: EASE.out,
        overwrite: "auto",
      });
    }
  };

  // Estado inicial, sem transição.
  const w = palco.clientWidth || 1;
  const h = palco.clientHeight || 1;
  pecas.forEach((el, i) => {
    const p = posicaoDaPeca("repouso", i, pecas.length, w, h);
    gsap.set(el, { x: p.x, y: p.y, rotate: p.rot, scale: p.scale, autoAlpha: p.opacity });
  });
  if (eixo) gsap.set(eixo, { autoAlpha: 0 });
  if (seta) gsap.set(seta, { drawSVG: "0%" });
  if (marca) gsap.set(marca, { autoAlpha: 0.5 });

  if (desktop && !isTouch()) {
    const onOver = (e) => {
      const li = e.target.closest("[data-forca]");
      if (li) aplicar(li.dataset.forca);
    };
    lista.addEventListener("pointerover", onOver);
    lista.addEventListener("focusin", onOver);
    limpezas.push(() => {
      lista.removeEventListener("pointerover", onOver);
      lista.removeEventListener("focusin", onOver);
    });

    /* Chegando na seção sem apontar nada, a primeira força assume: um palco
       parado em "repouso" parece quebrado, não convidativo. */
    const entrada = ScrollTrigger.create({
      trigger: palco.closest(".sec"),
      start: "top 55%",
      once: true,
      onEnter: () => aplicar(itens[0]?.dataset.forca || "alinhar"),
    });
    limpezas.push(() => entrada.kill());
  } else {
    itens.forEach((li) => {
      const st = ScrollTrigger.create({
        trigger: li,
        start: "top 70%",
        end: "bottom 40%",
        onToggle: (self) => self.isActive && aplicar(li.dataset.forca),
      });
      limpezas.push(() => st.kill());
    });
  }

  /* Redimensionar muda o palco: as posições são calculadas a partir dele. */
  const refazer = () => {
    const d = atual;
    atual = "";
    aplicar(d);
  };
  ScrollTrigger.addEventListener("refreshInit", refazer);
  limpezas.push(() => ScrollTrigger.removeEventListener("refreshInit", refazer));

  return () => limpezas.forEach((fn) => fn());
}

/**
 * CLIENTES — o arco desenhado e a marca em foco.
 *
 * O arco é traçado quando a seção entra. Apontar uma marca faz ela tomar a
 * cena: a ficha abre, o preview cresce e a outra recua. O Flip cuida da
 * mudança de layout — é ele que sabe de onde para onde cada peça foi.
 */
function clientesNoArco(q, desktop) {
  const [palco] = q("[data-quem-palco]");
  if (!palco) return null;

  const arco = palco.querySelector("[data-quem-arco]");
  const marcas = [...palco.querySelectorAll("[data-marca]")];
  if (!marcas.length) return null;

  const limpezas = [];

  if (arco) {
    gsap.set(arco, { drawSVG: "0%" });
    const traco = gsap.to(arco, {
      drawSVG: "100%",
      ease: "none",
      scrollTrigger: {
        trigger: palco,
        start: "top 78%",
        end: "bottom 62%",
        scrub: 0.8,
      },
    });
    limpezas.push(() => traco.scrollTrigger?.kill());
  }

  /* Só os elementos que de fato MUDAM de lugar. Incluir a ficha inteira punha
     um contêiner em `position: absolute` durante a tween, e as peças dentro
     dele passavam a se medir contra um pai que não era mais o do layout. */
  const pecas = () => palco.querySelectorAll("[data-flip-id]");

  const ativar = (i) => {
    const antes = Flip.getState(pecas(), { props: "textAlign" });
    marcas.forEach((el, k) => (el.dataset.active = String(k === i)));
    Flip.from(antes, {
      duration: 0.7,
      ease: "power3.inOut",
      absolute: true,
      nested: true,
      overwrite: "auto",
    });
  };

  if (desktop && !isTouch()) {
    const onOver = (e) => {
      const alvo = e.target.closest("[data-marca]");
      if (alvo) ativar(Number(alvo.dataset.indice));
    };
    const onLeave = () => ativar(-1);
    palco.addEventListener("pointerover", onOver);
    palco.addEventListener("focusin", onOver);
    palco.addEventListener("pointerleave", onLeave);
    limpezas.push(() => {
      palco.removeEventListener("pointerover", onOver);
      palco.removeEventListener("focusin", onOver);
      palco.removeEventListener("pointerleave", onLeave);
    });
  } else {
    marcas.forEach((el, i) => {
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top 68%",
        end: "bottom 42%",
        onToggle: (self) => self.isActive && ativar(i),
      });
      limpezas.push(() => st.kill());
    });
  }

  return () => limpezas.forEach((fn) => fn());
}

/**
 * Inclinação de cartão: a peça responde ao ponteiro como se tivesse espessura.
 * Poucos graus, sempre interpolados — e só onde há `data-tilt`, para não virar
 * tique da página inteira.
 */
function cartoesComInclinacao(q, desktop) {
  if (!desktop || isTouch()) return null;
  const cartoes = q("[data-tilt]");
  if (!cartoes.length) return null;

  const limpezas = cartoes.map((el) => {
    const girarX = gsap.quickTo(el, "rotationX", { duration: 0.6, ease: EASE.out });
    const girarY = gsap.quickTo(el, "rotationY", { duration: 0.6, ease: EASE.out });
    const subir = gsap.quickTo(el, "z", { duration: 0.6, ease: EASE.out });

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      girarY(nx * 7);
      girarX(ny * -6);
      subir(28);
    };
    const onOut = () => {
      girarX(0);
      girarY(0);
      subir(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onOut);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onOut);
      gsap.set(el, { rotationX: 0, rotationY: 0, z: 0 });
    };
  });

  return () => limpezas.forEach((fn) => fn());
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

/**
 * Sem movimento: toda cena nasce no estado FINAL.
 *
 * `prefers-reduced-motion` reduz animação, não conteúdo — quem pediu menos
 * movimento continua tendo direito à narrativa inteira. Cada estado inicial
 * escondido precisa de um correspondente aqui, ou a seção chega vazia.
 */
function estadoFinalSemMovimento(q) {
  const mostrar = (sel, props = {}) =>
    gsap.set(q(sel), { autoAlpha: 1, x: 0, y: 0, scale: 1, ...props });

  gsap.set(q("[data-bd-linha], [data-bd-guia], [data-bd-cota], [data-bd-traco]"), {
    drawSVG: "100%",
  });
  gsap.set(q("[data-bd-marca]"), { clipPath: "circle(62% at 50% 50%)", autoAlpha: 1, scale: 1 });
  mostrar("[data-bd-texto]");
  mostrar("[data-bd-spec]");
  mostrar("[data-bd-cor]");
  mostrar("[data-bd-aplicacao]");

  gsap.set(q("[data-est-malha]"), { drawSVG: "100% 100%" });
  gsap.set(q("[data-est-feixe], [data-est-seta]"), { drawSVG: "100%" });
  mostrar("[data-est-ponto]");
  mostrar("[data-est-rotulo]");
  mostrar("[data-est-halo]");
  mostrar("[data-est-nucleo]");

  gsap.set(q("[data-maquina-fio]"), { drawSVG: "100%" });
  mostrar("[data-maquina-ficha]");
  mostrar("[data-maquina-saida]");
  mostrar("[data-maquina-fecho]");
  mostrar(".maquina__anel");
  const etapas = q("[data-maquina-etapa]");
  gsap.set(etapas, { autoAlpha: 1, position: "relative", y: 0 });

  gsap.set(q("[data-quem-arco]"), { drawSVG: "100%" });

  // O palco das forças nasce montado, na demonstração de consistência.
  const [palco] = q("[data-palco]");
  if (palco) {
    palco.dataset.demo = "alinhar";
    const pecas = [...palco.querySelectorAll("[data-palco-peca]")];
    const w = palco.clientWidth || 1;
    const h = palco.clientHeight || 1;
    pecas.forEach((el, i) => {
      const p = posicaoDaPeca("alinhar", i, pecas.length, w, h);
      gsap.set(el, { x: p.x, y: p.y, rotate: 0, scale: 1, autoAlpha: 1 });
    });
    mostrar("[data-palco-marca]");
  }

  // Os palcos com estados de Flip param no estado final.
  const [social] = q("[data-social-palco]");
  if (social) social.dataset.estado = "feed";
  const [design] = q("[data-design-palco]");
  if (design) design.dataset.estado = "editorial";
  mostrar("[data-social-moldura]");
  mostrar("[data-razao]");
}
