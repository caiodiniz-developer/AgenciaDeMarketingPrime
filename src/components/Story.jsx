import { lazy, Suspense, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger, SplitText, Flip } from "../lib/gsap";
import { paintGradientAcross, gradientToken } from "../lib/gradientText";
import { cena, NASCIMENTO } from "../lib/progress";
import { sections } from "../content/story";
import { pickTier, prefersReducedMotion } from "../lib/media";
import { EASE, DUR, STAGGER, BEAT, DEPTH } from "../lib/motion";
import { isTouch, pointer, damp } from "../lib/pointer";
import { autoplayDeFundo } from "../lib/video";
import Section from "./Section";
import Rays from "./Rays";

// three.js sozinho pesa mais que todo o resto do site: sai do caminho da hero.
const LaptopScene = lazy(() => import("./LaptopScene"));

/**
 * O elemento que representa uma seção NO EIXO DO SCROLL.
 *
 * Uma seção presa não fica onde o layout diz. Durante o pin ela é retirada do
 * fluxo, e depois dele o ScrollTrigger a desloca até o fim do espaçador — de
 * modo que `getBoundingClientRect` devolve, em repouso, a posição do FIM da
 * seção, não a do começo. Qualquer gatilho medido nela nasce uma seção
 * inteira atrasado: o canal da tela, a luz, a presença do 3D e a pose
 * passavam a responder pela seção anterior.
 *
 * O espaçador, esse, ocupa exatamente o curso de scroll da seção. É nele que
 * tudo se mede — e só existe depois que os pins foram criados, que é por isso
 * que estes gatilhos são montados por último.
 */
const ancoraDe = (id) => {
  const el = document.querySelector(`[data-sec="${id}"]`);
  return el ? el.closest(".pin-spacer") || el : null;
};

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
        /* Até o FIM DO DOCUMENTO, e não até a narrativa sair da tela.
           O último ato — a tampa fechando enquanto a página descobre o
           rodapé — acontece depois de `.story` passar do topo. Com
           `bottom top` o `frameloop` virava "never" bem ali: o canvas
           parava de desenhar e guardava o último quadro, então o notebook
           congelava no meio do trajeto e a tampa nunca fechava. */
        end: "max",
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

            /* Autoplay dos fundos: um observador para todos, ligado aqui e não
             por seção. Ver lib/video.js — o gatilho por seção não funcionava
             em seção presa, e era metade dos vídeos do site parados. */
          limpezas.push(autoplayDeFundo(root.current));

          limpezas.push(
              caminhoDoNotebook(root.current),
              tampaFechando(),
              transicaoEntreSecoes(q, desktop),
              faixaDoManifesto(q),
              palavrasAcendendo(q),
              indiceInterativo(q, desktop),
              forcasDoSistema(q, desktop),
              clientesNoArco(q),
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
            const alvo = ancoraDe(s.id);
            const alvoProximo = proxima && ancoraDe(proxima.id);
            return ScrollTrigger.create({
              trigger: alvo,
              /* A entrega da faixa acontece quando a PRÓXIMA seção já cobre
                 mais da metade da tela. Em 60% a troca vinha cedo demais:
                 numa seção curta, a faixa seguinte assumia enquanto a atual
                 ainda era o que o leitor estava lendo — e a tela do notebook
                 trocava de canal antes da hora. */
              start: "top 45%",
              /* A faixa termina onde a PRÓXIMA começa, e não na base desta.
                 Com `bottom 40%`, uma seção presa por três telas sai da
                 própria faixa logo no início do pin: dali até a seção seguinte
                 não há nenhuma ativa, e a cena congela no estado da anterior.
                 Amarrar no elemento seguinte também imuniza contra o pin. */
              endTrigger: alvoProximo || alvo,
              end: alvoProximo ? "top 45%" : "bottom bottom",
              /* Canal e presença são reafirmados a CADA quadro em que a
                 faixa está ativa, e não só na virada.

                 `onToggle` só dispara quando o estado muda. Descendo isso
                 basta; num salto — âncora, restauração de scroll, volta ao
                 topo — várias faixas mudam de estado no mesmo update e a
                 última a escrever não é necessariamente a que ficou ativa.
                 O resultado era a tela do notebook exibindo o canal de uma
                 seção que já tinha ficado para trás. Duas atribuições por
                 quadro custam nada; discordar do scroll custa a ilusão. */
              onUpdate: () => {
                cena.secao = s.id;
                if (s.canal) cena.canal = s.canal;
                /* Só o degrau da seção. O produto com o nascimento é feito
                   no loop de render — ver lib/progress.js. */
                cena.presente = s.presente === false ? 0 : 1;
              },
              onToggle: (self) => {
                if (!self.isActive) return;

                /* O que é CARO fica na virada: mexer no estado do React
                   re-renderiza a árvore, e o shader dos raios recompila. */
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

          sections
            .filter((s) => s.theme === "bone")
            .forEach((s) => {
              const i = sections.indexOf(s);
              const proxima = sections[i + 1];
              const alvo = ancoraDe(s.id);
              const alvoProximo = proxima && ancoraDe(proxima.id);
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
 * Seções em que o objeto NÃO deriva.
 *
 * Em WEB ele precisa ficar frontal e centrado: é de lá que a câmera entra na
 * tela, e um objeto ainda girando arruinaria o único momento em que ele tem
 * de estar imóvel.
 */
const SEM_DERIVA = new Set(["web"]);

/**
 * Para onde a pose ESCORRE enquanto a seção é lida.
 *
 * A versão anterior fazia o objeto chegar à pose nos primeiros 25% da faixa
 * e segurar o resto. Como as faixas das seções presas têm quatro mil pixels,
 * na prática ele passava a maior parte do site PARADO — e objeto parado numa
 * página que rola lê como imagem colada, não como coisa no espaço.
 *
 * Agora a pose continua escorrendo até o fim da faixa: gira um pouco mais,
 * aproxima ou afasta, e desliza para o lado. O destino da deriva é calculado
 * com a mesma função que a produz, e é ELE que vira o ponto de partida do
 * trecho seguinte — sem isso haveria um salto na emenda.
 *
 * A direção alterna com o índice: duas seções seguidas derivando para o mesmo
 * lado somariam num único movimento longo em vez de parecerem duas decisões.
 */
function derivar(pose, i, t) {
  if (!pose) return pose;
  const lado = i % 2 ? 1 : -1;
  return {
    x: pose.x + lado * 0.17 * t,
    y: pose.y + (i % 3 === 0 ? 0.09 : -0.07) * t,
    scale: pose.scale * (1 + lado * 0.13 * t),
    rotY: pose.rotY - lado * 0.34 * t,
    rotX: pose.rotX + 0.045 * t,
  };
}

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
function caminhoDoNotebook(raiz) {
  const tweens = [];
  const gatilhos = [];
  let anterior = { ...NASCIMENTO };

  /* ── O NASCIMENTO ─────────────────────────────────────────────────────
     Durante a hero o objeto não existe: a cena sticky mora dentro de
     `.story`, cujo topo está na base da janela, então ele fica abaixo da
     dobra sem nenhuma regra extra.

     Aqui ele NASCE. Vem do fundo do quadro — minúsculo, no centro, tombado
     para trás —, cresce e sai para a primeira pose. Entrar deslizando pela
     borda seria "mais um elemento chegando"; vir do escuro é um começo.
     A presença sobe junto, então a primeira coisa que se vê é um ponto de
     luz virando objeto. */
  cena.nascido = 0;
  cena.presenca = 0;
  cena.presente = 1;
  Object.assign(cena.pose, NASCIMENTO);
  const nascer = { p: 0 };
  tweens.push(
    gsap.to(nascer, {
      p: 1,
      ease: "none",
      onUpdate: () => (cena.nascido = nascer.p),
      scrollTrigger: {
        trigger: raiz,
        /* Depois de a cena PRENDER, não antes.
           A camada 3D é sticky dentro de `.story`: enquanto o topo da
           narrativa ainda está descendo pela tela, o canvas inteiro está
           abaixo da dobra. Um nascimento agendado ali acontece fora do
           quadro — a presença sobe, o objeto cresce, e o leitor não vê nada.
           A partir de "top 45%" a cena já cobre a janela. */
        start: "top 45%",
        end: "top -20%",
        scrub: 1,
        invalidateOnRefresh: true,
      },
    })
  );

  /* ── O TRAJETO ────────────────────────────────────────────────────────
     Um trecho por seção, e cada trecho COBRE A FAIXA INTEIRA da sua seção —
     do momento em que ela entra pela base até a seguinte fazer o mesmo.

     A versão anterior recortava cada trecho só na chegada ("top bottom" →
     "top 30%") e deixava o resto da seção sem ninguém escrevendo. Descendo
     funcionava, porque o trecho seguinte assumia logo. SUBINDO, não: uma
     tween com scrub que já está no fim não reescreve nada, então a pose
     ficava travada na última seção visitada e o objeto acompanhava o leitor
     de volta parado no lugar errado.

     Agora a viagem ocupa os primeiros 25% da faixa e os 75% restantes são
     uma pausa — que continua sendo renderizada. Em qualquer ponto da página
     existe exatamente um trecho ativo, e ele é sempre o dono da pose. */
  sections.forEach((s, i) => {
    if (!s.laptop) return;
    const de = { ...anterior };
    const proxima = sections.slice(i + 1).find((n) => n.laptop);
    const alvo = ancoraDe(s.id);
    const alvoProximo = proxima && ancoraDe(proxima.id);
    if (!alvo) return;

    /* A VIAGEM. Distância de scroll FIXA — da base da tela até a seção
       assumir o quadro —, e não uma fração da faixa.

       Fração não serve porque as faixas têm tamanhos absurdamente
       diferentes: uma seção presa mede quatro mil pixels e uma solta mede
       novecentos. Vinte e cinco por cento de quatro mil é mais de uma tela
       de viagem: o objeto só chegava à pose depois que o leitor já tinha
       lido metade da seção. */
    tweens.push(
      gsap.fromTo(cena.pose, de, {
        ...s.laptop,
        ease: "none",
        immediateRender: false,
        scrollTrigger: {
          /* A primeira seção começa mais tarde: é ali que o objeto NASCE, e
             o nascimento tem de coincidir com o momento em que a cena 3D já
             cobre a janela. */
          trigger: alvo,
          start: i === 0 ? "top 45%" : "top bottom",
          end: i === 0 ? "top -20%" : "top 32%",
          scrub: 0.9,
          invalidateOnRefresh: true,
        },
      })
    );

    /* A DERIVA. No resto da faixa a pose continua escorrendo, em vez de
       congelar no alvo.

       Este gatilho também é quem mantém a AUTORIDADE sobre a pose: uma tween
       com scrub que já chegou ao fim para de escrever, e sem ninguém no
       comando a pose ficava travada na última seção visitada — descendo
       ninguém notava, porque a próxima assumia logo; subindo, o objeto
       acompanhava o leitor de volta parado no lugar errado. */
    const derivaAtiva = !SEM_DERIVA.has(s.id);

    gatilhos.push(
      ScrollTrigger.create({
        trigger: alvo,
        start: i === 0 ? "top -20%" : "top 32%",
        endTrigger: alvoProximo || alvo,
        end: alvoProximo ? "top bottom" : "bottom bottom",
        onUpdate: (self) =>
          Object.assign(
            cena.pose,
            derivaAtiva ? derivar(s.laptop, i, self.progress) : s.laptop
          ),
      })
    );

    /* O trecho seguinte parte DE ONDE A DERIVA TERMINOU, e não da pose
       nominal da seção. Partir da nominal daria um salto na emenda, do
       tamanho exato da deriva. */
    anterior = derivaAtiva ? derivar(s.laptop, i, 1) : s.laptop;
  });

  /* ── O REFLEXO ────────────────────────────────────────────────────────
     Uma volta e meia de luz de contorno ao longo da narrativa inteira: o
     dourado corre pelo alumínio enquanto a página corre. É lento de
     propósito — reflexo que pisca vira estroboscópio. */
  const luz = { v: 0, g: 0 };
  tweens.push(
    gsap.to(luz, {
      v: 1.5,
      /* Um terço de volta ao longo da página inteira. É pouco de propósito:
         somado às poses, dá a sensação de um objeto que nunca para — sem
         nunca virar um carrossel girando sozinho. */
      g: 1.1,
      ease: "none",
      onUpdate: () => {
        cena.brilho = luz.v;
        cena.giro = luz.g;
      },
      scrollTrigger: { trigger: raiz, start: "top bottom", end: "bottom bottom", scrub: 1.4 },
    })
  );

  return () => {
    tweens.forEach((t) => {
      t.scrollTrigger?.kill();
      t.kill();
    });
    gatilhos.forEach((g) => g.kill());
    cena.presente = 1;
    cena.presenca = 1;
    cena.nascido = 1;
  };
}

/**
 * A TAMPA FECHANDO.
 *
 * O último movimento da narrativa. Depois do CTA, enquanto a página desliza
 * para descobrir o rodapé, a tampa desce sobre a base e a tela se apaga
 * junto. O objeto que apresentou o site inteiro se encerra — e é a mesma
 * ideia do rodapé: o fim é um gesto, não mais um texto.
 *
 * Só acontece porque o modelo aceitou ganhar uma dobradiça (ver
 * LaptopScene): a partição entre tampa e base é deduzida da geometria, não
 * de nomes de nó, que o arquivo não tem.
 */
function tampaFechando() {
  /* O gatilho é a SAÍDA DO CTA, não o espaçador do rodapé.
     O espaçador tem exatamente a altura do rodapé — é ele que dá curso para
     a página descobri-lo — e o rodapé encolheu para uma linha de assinatura.
     Com cento e noventa pixels de curso, a tampa parava na metade do
     caminho: o último gesto da narrativa simplesmente não terminava.
     A saída do CTA tem uma tela inteira, e é exatamente onde o objeto está
     pousado. */
  const alvo = document.querySelector('[data-sec="contato"]');
  if (!alvo) return null;

  const fecho = sections[sections.length - 1]?.laptop;

  const estado = { t: 0 };
  const tw = gsap.to(estado, {
    t: 1,
    ease: "none",
    onUpdate: () => {
      cena.tampa = estado.t;
      /* Uma tween com scrub renderiza uma vez ao ser criada, no progresso 0.
         Sem esta guarda, esse primeiro quadro escrevia a pose do FECHO logo
         no carregamento — e o notebook aparecia pronto, no centro, antes de
         nascer. */
      if (estado.t <= 0.001) return;
      /* O estado final é reafirmado aqui, e não deixado por conta do último
         gatilho de seção. Numa rolagem contínua os dois dão o mesmo
         resultado; num SALTO — voltar de um link âncora, restaurar a posição
         ao recarregar, um teste automatizado — as tweens com scrub que já
         estavam completas não reescrevem nada, e o objeto herdava a pose de
         uma seção qualquer do meio da página. */
      if (fecho) Object.assign(cena.pose, fecho);
      cena.canal = "prime";
      cena.nascido = 1;
      cena.presente = 1;
    },
    scrollTrigger: {
      trigger: alvo,
      /* Começa quando o CTA assume a tela e termina pouco antes do fim do
         documento. Depois do CTA sobra só a altura do rodapé de curso — e o
         rodapé agora é uma linha —, então a janela tem de ser aberta ANTES,
         enquanto a seção ainda está subindo. */
      start: "top 30%",
      end: "bottom 80%",
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });

  /* ── O REPOUSO ────────────────────────────────────────────────────────
     Do fim do fechamento até o fim do documento, alguém precisa continuar
     afirmando o estado final.

     Uma tween com scrub para de escrever quando chega ao fim, e depois do
     CTA não há mais nenhuma faixa de seção ativa. O resultado era o objeto
     soltando no último trecho da página: enquanto o rodapé era descoberto,
     o notebook escorregava de volta para uma pose antiga, com a tampa
     aberta — bem no gesto que fecha a narrativa. */
  const repouso = ScrollTrigger.create({
    trigger: alvo,
    start: "bottom 80%",
    end: "max",
    onUpdate: () => {
      cena.tampa = 1;
      cena.nascido = 1;
      cena.presente = 1;
      cena.canal = "prime";
      if (fecho) Object.assign(cena.pose, fecho);
    },
  });

  return () => {
    tw.scrollTrigger?.kill();
    repouso.kill();
    cena.tampa = 0;
  };
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

  const limpezas = [];
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

  const limpezas = [];

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

  /* ── 1 · a câmera entra ──────────────────────────────────────────────
     A aproximação TERMINA antes de a página nascer. Sobrepostas, via-se um
     notebook de tamanho normal com uma página em tamanho real atravessando
     por trás dele — duas escalas disputando o mesmo quadro. Em sequência, a
     leitura é a certa: a tela cresce até encher a janela, e só então o que
     está dentro dela vira a página. */
  tl.to(estado, { zoom: 1, duration: 0.26 }, 0.28)
    .to(texto, { autoAlpha: 0, y: -40, duration: 0.16 }, 0.28)
    .to(entregas, { autoAlpha: 0, duration: 0.12 }, 0.28)
    /* Os argumentos também saem. Enquanto a seção estava por baixo da camada
       3D, deixá-los acesos era profundidade; com a seção elevada para a
       página fullscreen, eles passam a pintar POR CIMA do notebook — texto
       de uma cena que já terminou, flutuando sobre a que começou. */
    .to(razoes, { autoAlpha: 0, duration: 0.12 }, 0.3)
    .to(razoes, { autoAlpha: 1, duration: 0.1 }, 0.94);

  /* ── 2 · a página nasce dentro do painel, já cheio ───────────────────
     A seção sobe de camada durante este trecho.

     `.sec` tem `z-index: 3` e isso CRIA um contexto de empilhamento: o
     `z-index: 6` do painel só valia lá dentro, e a camada 3D — que está em
     4, no contexto de fora — ficava por cima. A página fullscreen aparecia
     ATRÁS do notebook, visível só na moldura em volta dele.

     Subir a seção inteira é seguro aqui porque, neste ponto, todo o resto
     dela já saiu de cena: título, argumentos e entregas estão apagados. */
  /* O ESPAÇADOR também sobe. Ele é o filho direto de `.story` — a seção
     presa mora dentro dele —, e é o z-index DELE que compete com a camada
     3D no contexto de empilhamento da narrativa. Subir só a seção não
     bastava: ela estava aninhada num irmão que continuava em `auto`. */
  const camada = sec.closest(".pin-spacer") || sec;
  tl.set([sec, camada], { zIndex: 6 }, 0.5);
  if (dentro) tl.to(dentro, { clipPath: aberto, duration: 0.1 }, 0.54);

  /* ── 3 · o scroll da página é o scroll do site ───────────────────────
     O trecho mais longo da sequência, de propósito: é aqui que o leitor
     está DENTRO da tela, e é esse tempo parado que transforma o efeito em
     momento. */
  if (quadro) {
    tl.fromTo(
      quadro,
      { y: 0 },
      { y: () => -Math.max(0, quadro.scrollHeight - window.innerHeight * 0.92), duration: 0.22 },
      0.64
    );
  }

  // 4 · sai de cena e a câmera recua junto
  if (dentro) tl.to(dentro, { clipPath: fechado, duration: 0.1 }, 0.86);
  tl.set([sec, camada], { zIndex: 3 }, 0.96);
  tl.to(estado, { zoom: 0, duration: 0.12 }, 0.88)
    .to(texto, { autoAlpha: 1, y: 0, duration: 0.08 }, 0.94);

  limpezas.push(() => {
    tl.scrollTrigger?.kill();
    cena.zoom = 0;
    gsap.set([sec, sec.closest(".pin-spacer") || sec], { clearProps: "zIndex" });
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

  const limpezas = [];
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

  return () => tl.scrollTrigger?.kill();
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
  const fio = maq.querySelector("[data-maquina-fio]");
  const ramos = [...maq.querySelectorAll("[data-maquina-ramo]")];
  const fichas = [...maq.querySelectorAll("[data-maquina-ficha]")];
  const saidas = [...maq.querySelectorAll("[data-maquina-saida]")];
  const etapas = [...maq.querySelectorAll("[data-maquina-etapa]")];
  const aneis = [...maq.querySelectorAll(".maquina__anel")];
  const fecho = maq.querySelector("[data-maquina-fecho]");
  if (!fio) return null;

  /* As peças andam sobre o MESMO path que está desenhado. `align` faz o GSAP
     converter entre o espaço do SVG e o do elemento — é por isso que a ficha
     segue a curva de verdade em vez de correr numa reta paralela a ela. */
  const sobreAEsteira = (el, de, ate, extra = {}) => ({
    motionPath: {
      path: fio,
      align: fio,
      alignOrigin: [0.5, 0.5],
      start: de,
      end: ate,
      ...extra,
    },
  });

  gsap.set(fio, { drawSVG: "0%" });
  gsap.set(ramos, { drawSVG: "0%" });
  gsap.set(aneis, { autoAlpha: 0, scale: 0.7, transformOrigin: "50% 50%" });
  gsap.set(etapas, { autoAlpha: 0, y: 22 });
  if (fecho) gsap.set(fecho, { autoAlpha: 0, y: 20 });

  /* Estado de partida: as informações chegam SOLTAS, fora da esteira. É o
     ponto da narrativa em que a empresa tem os dados e nenhum sistema. */
  fichas.forEach((f, i) => {
    /* Espalhadas de verdade: a faixa vertical inteira do palco, e um degrau
       horizontal maior. Com 21% de passo elas ficavam a oito pixels umas das
       outras — na tela, quatro etiquetas coladas em coluna, que é o oposto de
       "informação solta". */
    gsap.set(f, {
      autoAlpha: 0,
      xPercent: -50,
      yPercent: -50,
      left: `${7 + (i % 2) * 13}%`,
      top: `${11 + i * 26}%`,
      rotate: (i % 2 ? 1 : -1) * (3 + i),
      scale: 0.92,
    });
  });
  /* As entregas saem em DUAS FILAS, uma acima e outra abaixo da esteira.
     Numa fila só, sete pílulas de noventa pixels não cabem na metade final
     da curva: elas se encavalavam duas a duas e o comboio virava um borrão.
     `yPercent` é seguro aqui porque o MotionPath escreve em `x`/`y` — os dois
     canais se somam sem disputar a mesma propriedade. */
  saidas.forEach((el, i) => {
    gsap.set(el, {
      autoAlpha: 0,
      xPercent: -50,
      yPercent: i % 2 ? -145 : 45,
      left: "50%",
      top: "50%",
      scale: 0.6,
    });
  });

  let etapaAtual = -1;
  const mostrarEtapa = (i) => {
    if (i === etapaAtual) return;
    etapaAtual = i;
    etapas.forEach((el, k) =>
      gsap.to(el, {
        autoAlpha: k === i ? 1 : 0,
        y: k === i ? 0 : k < i ? -22 : 22,
        duration: DUR.ui,
        ease: EASE.out,
        overwrite: "auto",
      })
    );
  };

  const tl = gsap.timeline({
    defaults: { ease: "none" },
    scrollTrigger: {
      trigger: sec,
      start: "top top",
      /* Quatro telas e meia: a sequência tem cinco atos, e comprimir isso em
         duas telas transforma processo em pisca-pisca. */
      end: () => `+=${window.innerHeight * (desktop ? 4.5 : 3.2)}`,
      pin: true,
      scrub: 0.8,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        if (p < 0.24) mostrarEtapa(-1);
        else mostrarEtapa(Math.min(3, Math.floor((p - 0.24) / 0.19)));
      },
    },
  });

  /* ── 1 · ENTRA ───────────────────────────────────────────────────────
     As informações aparecem soltas e a esteira começa a ser desenhada por
     baixo delas. Ainda não há sistema: há material. */
  tl.to(fichas, { autoAlpha: 1, duration: 0.25, stagger: 0.06, ease: EASE.out }, 0)
    .to(fio, { drawSVG: "0% 48%", duration: 0.5 }, 0.18)
    .to(aneis, { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.08, ease: EASE.out }, 0.45);

  /* ── 2 · ESCUTAR ─────────────────────────────────────────────────────
     A linha CAPTURA cada ficha e a leva até o núcleo. Elas entram em fila,
     não em bloco: o escalonamento é o que faz a esteira parecer esteira. */
  fichas.forEach((f, i) => {
    tl.to(
      f,
      {
        /* Cada uma ENTRA num ponto distante da esteira e para num ponto
           distinto. Com origens a três centésimos umas das outras, as quatro
           chegavam à linha praticamente no mesmo lugar e no mesmo instante:
           uma pilha de etiquetas se movendo junto, não uma esteira. */
        /* Espaçamento de 0,135 do comprimento do caminho: uma ficha mede
           cerca de 0,11 dele. Com 0,065 — metade da própria largura — as
           quatro chegavam empilhadas em diagonal, que foi exatamente o que
           apareceu na tela. A última para NO núcleo; as outras formam a fila
           que o alimenta. */
        ...sobreAEsteira(f, i * 0.1, 0.13 + i * 0.135),
        rotate: 0,
        scale: 1,
        duration: 0.8,
        ease: "power1.inOut",
      },
      /* E entram em fila indiana. O intervalo é o que faz a esteira parecer
         esteira: quatro peças partindo juntas são um bloco. */
      0.6 + i * 0.16
    );
  });

  /* ── 3 · DECIDIR ─────────────────────────────────────────────────────
     Três caminhos se abrem. Dois apagam. Um continua dourado — que é a
     definição visual de decidir: não é escolher, é DESCARTAR. */
  tl.to(ramos, { drawSVG: "100%", duration: 0.45, stagger: 0.06 }, 1.7)
    .to(
      ramos.filter((r) => r.dataset.fica !== "true"),
      { drawSVG: "100% 100%", autoAlpha: 0, duration: 0.4, stagger: 0.08 },
      2.15
    )
    .to(ramos.find((r) => r.dataset.fica === "true"), { autoAlpha: 1, duration: 0.3 }, 2.15);

  /* ── 4 · PRODUZIR ────────────────────────────────────────────────────
     No mesmo ponto em que a matéria-prima parou, ela vira outra coisa: as
     fichas encolhem para dentro do núcleo e as entregas nascem dali. Não é
     um corte — é o mesmo lugar, duas formas. */
  tl.to(fichas, { scale: 0.35, autoAlpha: 0, duration: 0.4, stagger: 0.04, ease: EASE.out }, 2.5);

  /* ── 5 · NO AR ───────────────────────────────────────────────────────
     As entregas percorrem o RESTO da mesma esteira e saem pela direita.
     A frase da seção — "entra informação, sai presença" — acontece
     literalmente, da esquerda para a direita, na mesma linha. */
  tl.to(fio, { drawSVG: "0% 100%", duration: 0.6 }, 2.7);

  /* NO CELULAR AS ENTREGAS NÃO SOBEM NA ESTEIRA.
     São sete pílulas de setenta pixels numa curva de trezentos e sessenta:
     não cabem, e o comboio vira uma pilha. Ali elas caem numa fileira
     embaixo do palco — o mesmo desfecho ("sai presença"), num formato que a
     largura comporta. */
  if (!desktop) {
    saidas.forEach((el, i) => {
      tl.to(
        el,
        { autoAlpha: 1, scale: 1, duration: 0.3, ease: EASE.out },
        2.8 + i * 0.08
      );
    });
    tl.to(fecho, { autoAlpha: 1, y: 0, duration: 0.4, ease: EASE.out }, 3.9).to(
      {},
      { duration: 0.45 },
      4.1
    );
    return () => tl.scrollTrigger?.kill();
  }

  saidas.forEach((el, i) => {
    /* Cada entrega ACENDE no instante em que parte. Antes todas nasciam
       juntas no núcleo e ficavam ali empilhadas até a vez de cada uma: sete
       pílulas exatamente sobrepostas no centro do palco. */
    tl.to(
      el,
      { autoAlpha: 1, scale: 1, duration: 0.25, ease: EASE.out },
      2.82 + i * 0.09
    );
    tl.to(
      el,
      {
        /* Sete paradas distintas ao longo da metade final da esteira: as
           entregas saem em COMBOIO. Empilhadas no mesmo ponto, sete viram
           três, e o "sai presença" perde a quantidade — que é metade do
           argumento. */
        ...sobreAEsteira(el, 0.52, 0.56 + i * 0.064),
        duration: 0.9,
        ease: "power1.inOut",
      },
      2.85 + i * 0.09
    );
  });

  tl.to(fecho, { autoAlpha: 1, y: 0, duration: 0.4, ease: EASE.out }, 3.9)
    // Pausa no clímax: sem ela o fecho aparece no último quadro do pin.
    .to({}, { duration: 0.45 }, 4.1);

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
        /* `left`/`top` e não `x`/`y`: o campo magnético é dono do transform
           da peça, e duas fontes escrevendo na mesma propriedade brigam a
           cada quadro. Aqui a posição de LAYOUT e o desvio do CURSOR vivem
           em canais separados e se somam sem se atropelar. */
        left: p.x,
        top: p.y,
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
    gsap.set(el, { left: p.x, top: p.y, x: 0, y: 0, rotate: p.rot, scale: p.scale, autoAlpha: p.opacity });
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

  /* ── O CAMPO MAGNÉTICO ────────────────────────────────────────────────
     A composição não espera o clique: ela REAGE ao cursor o tempo todo.
     Sem uma força escolhida, as peças fogem dele — comunicação sem direção
     se espalha. Com uma força ativa, elas obedecem à lógica dela: a de
     DIREÇÃO puxa para o eixo, a de CONSISTÊNCIA resiste ao empurrão, a de
     ESTRATÉGIA aponta o cursor como se fosse o objetivo.

     O deslocamento é somado POR CIMA da posição do layout, num segundo nó de
     transform (`x`/`y` na peça, `--mx`/`--my` no interior), porque a posição
     de base é escrita pelas tweens de demonstração — as duas brigariam pela
     mesma propriedade. */
  if (desktop && !isTouch() && !prefersReducedMotion()) {
    const estados = pecas.map(() => ({ dx: 0, dy: 0 }));
    /* Um `quickSetter` por eixo. `quickSetter(el, "css", {...})` parece
       conveniente mas não aceita `x`/`y`: eles são atalhos de transform do
       GSAP, não propriedades de CSS, e o navegador rejeita a escrita. */
    const moverX = pecas.map((el) => gsap.quickSetter(el, "x", "px"));
    const moverY = pecas.map((el) => gsap.quickSetter(el, "y", "px"));
    let dentro = false;

    const visivel = ScrollTrigger.create({
      trigger: palco.closest(".sec"),
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        dentro = self.isActive;
        /* `will-change` só enquanto o campo está de fato rodando. Deixado
           fixo no CSS, ele mantém doze camadas promovidas na memória de
           vídeo pela página inteira — o custo que a marca de higiene do
           verificador existe para pegar. */
        pecas.forEach((el) => {
          el.style.willChange = self.isActive ? "transform" : "";
        });
      },
    });
    limpezas.push(() => {
      visivel.kill();
      pecas.forEach((el) => (el.style.willChange = ""));
    });

    const tick = (_t, dtMs) => {
      if (!dentro) return;
      const dt = Math.min(dtMs / 1000, 0.05);
      const r = palco.getBoundingClientRect();
      const px = pointer.x - r.left;
      const py = pointer.y - r.top;
      const perto = pointer.active && px > -80 && px < r.width + 80 && py > -80 && py < r.height + 80;

      for (let i = 0; i < pecas.length; i++) {
        const p = pecas[i].getBoundingClientRect();
        const cx = p.left + p.width / 2 - r.left;
        const cy = p.top + p.height / 2 - r.top;
        let ax = 0;
        let ay = 0;

        if (perto) {
          const vx = cx - px;
          const vy = cy - py;
          const d = Math.hypot(vx, vy) || 1;
          const forca = Math.max(0, 1 - d / 240);

          if (forca > 0) {
            const u = { x: vx / d, y: vy / d };
            if (atual === "apontar" || atual === "convergir") {
              // Direção e estratégia ATRAEM: o cursor vira o objetivo.
              ax = -u.x * forca * 26;
              ay = -u.y * forca * 26;
            } else if (atual === "alinhar" || atual === "refinar") {
              // Consistência e qualidade resistem: quase não cedem.
              ax = u.x * forca * 7;
              ay = u.y * forca * 7;
            } else {
              // Sem direção, tudo se espalha.
              ax = u.x * forca * 40;
              ay = u.y * forca * 40;
            }
          }
        }

        const e = estados[i];
        e.dx = damp(e.dx, ax, 0.09, dt);
        e.dy = damp(e.dy, ay, 0.09, dt);
        moverX[i](e.dx);
        moverY[i](e.dy);
      }
    };

    gsap.ticker.add(tick);
    limpezas.push(() => {
      gsap.ticker.remove(tick);
      pecas.forEach((el) => gsap.set(el, { x: 0, y: 0 }));
    });
  }

  return () => limpezas.forEach((fn) => fn());
}

/**
 * CLIENTES — o arco desenhado e a marca em foco.
 *
 * O arco é traçado quando a seção entra. Apontar uma marca faz ela tomar a
 * cena: a ficha abre, o preview cresce e a outra recua. O Flip cuida da
 * mudança de layout — é ele que sabe de onde para onde cada peça foi.
 */
function clientesNoArco(q) {
  const [palco] = q("[data-quem-palco]");
  const arco = palco?.querySelector("[data-quem-arco]");
  const no = palco?.querySelector("[data-quem-no]");
  const centro = palco?.querySelector("[data-quem-centro]");
  if (!arco) return null;

  /* Só o DESENHO fica aqui. Quem decide a marca em foco é o React, pelo
     ponteiro e pelo teclado — a versão anterior escrevia `data-active` por
     fora, e as duas fontes discordavam no primeiro hover: o componente
     abria o painel de uma marca enquanto o GSAP acendia a outra. */
  const tweens = [];

  gsap.set(arco, { drawSVG: "0%" });
  gsap.set([no, centro].filter(Boolean), { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%" });

  tweens.push(
    gsap.to(arco, {
      drawSVG: "100%",
      ease: "none",
      scrollTrigger: { trigger: palco, start: "top 80%", end: "bottom 65%", scrub: 0.8 },
    })
  );

  /* O nó e o nome da Prime só acendem quando o arco já passou por eles: o
     ponto de encontro tem de ser consequência da linha, não um enfeite que
     já estava lá. */
  tweens.push(
    gsap.to([no, centro].filter(Boolean), {
      autoAlpha: 1,
      scale: 1,
      ease: EASE.out,
      duration: 0.6,
      stagger: 0.12,
      scrollTrigger: { trigger: palco, start: "top 45%", once: true },
    })
  );

  return () => tweens.forEach((t) => t.scrollTrigger?.kill());
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

  /* Sem o trajeto, a pose ficaria na de NASCIMENTO — um ponto minúsculo no
     centro da tela, que é o começo de uma animação que não vai acontecer.
     Aqui o objeto assume de uma vez a pose do fecho: presente, de frente,
     parado. Reduzir movimento não é remover o personagem. */
  Object.assign(cena.pose, { x: 0.62, y: -0.5, scale: 0.7, rotY: -0.5, rotX: 0.08 });
  cena.nascido = 1;
  cena.presente = 1;
  cena.presenca = 1;
  cena.canal = "prime";

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
  mostrar("[data-quem-no]");
  mostrar("[data-quem-centro]");

  // O palco das forças nasce montado, na demonstração de consistência.
  const [palco] = q("[data-palco]");
  if (palco) {
    palco.dataset.demo = "alinhar";
    const pecas = [...palco.querySelectorAll("[data-palco-peca]")];
    const w = palco.clientWidth || 1;
    const h = palco.clientHeight || 1;
    pecas.forEach((el, i) => {
      const p = posicaoDaPeca("alinhar", i, pecas.length, w, h);
      gsap.set(el, { left: p.x, top: p.y, rotate: 0, scale: 1, autoAlpha: 1 });
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
