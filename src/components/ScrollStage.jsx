import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, ScrollTrigger } from "../lib/gsap";
import { pickTier, sourceFor, POSTER } from "../lib/media";
import { paintGradientAcross, gradientToken } from "../lib/gradientText";
import { useVideoScrub } from "../hooks/useVideoScrub";
import { MARKS, TRACK_VH } from "../content/story";
import Hero from "./Hero";
import Rays from "./Rays";

const FPS = 30;

/**
 * A sequência de abertura: o vídeo não toca, o scroll é que avança e recua
 * os quadros. O trilho alto define a duração; o palco gruda dentro dele.
 *
 * Camadas, de trás para frente:
 *   vídeo → GodRays → gradientes/vinheta/grain → tipografia
 * A luz nasce DENTRO da cena, entre o vídeo e os overlays — é por isso que
 * ela parece pertencer ao quadro em vez de estar colada por cima.
 */
export default function ScrollStage() {
  const track = useRef(null);
  const video = useRef(null);
  const introPlayed = useRef(false);

  const [tier, setTier] = useState(() => pickTier());
  const [fontsReady, setFontsReady] = useState(false);
  /* Só a LARGURA entra como dependência: no mobile a barra de endereço muda a
     altura durante o próprio scroll, e reconstruir a timeline ali daria um
     salto a cada rolagem. O palco usa 100svh justamente para não depender dela. */
  const [width, setWidth] = useState(() => window.innerWidth);

  const source = sourceFor(tier);
  const hasVideo = Boolean(source.src);

  useEffect(() => {
    document.fonts.ready.then(() => setFontsReady(true));
  }, []);

  useEffect(() => {
    let timer;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setWidth(window.innerWidth), 250);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  /* Revela o vídeo só quando ele tem quadro para mostrar; até lá o poster
     segura a tela. Se nunca chegar, a experiência cai para o modo estático. */
  useEffect(() => {
    const el = video.current;
    if (!hasVideo || !el) return;

    // React seta a PROPRIEDADE muted mas não o atributo — e o iOS lê os dois.
    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute("muted", "");

    let settled = false;

    const reveal = () => {
      settled = true;
      gsap.to(el, { opacity: 1, duration: 0.9, ease: "power2.out" });
      ScrollTrigger.refresh();
    };
    const fail = () => {
      if (!settled) setTier("static");
    };

    el.addEventListener("canplay", reveal, { once: true });
    el.addEventListener("error", fail, { once: true });

    const timeout = window.setTimeout(fail, 12000);

    return () => {
      window.clearTimeout(timeout);
      el.removeEventListener("canplay", reveal);
      el.removeEventListener("error", fail);
    };
  }, [hasVideo, source.src]);

  useVideoScrub({ videoRef: video, trackRef: track, fps: FPS, enabled: hasVideo });

  useGSAP(
    () => {
      if (!fontsReady) return;

      const q = gsap.utils.selector(track);
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: "(min-width: 768px)",
          mobile: "(max-width: 767px)",
          reduce: "(prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { desktop, reduce } = ctx.conditions;
          // Blur em scrub custa raster por quadro: só onde há folga de GPU.
          const haze = desktop && !reduce ? 6 : 0;

          const chars = q("[data-hero-char]");
          const kicker = q("[data-hero-kicker]");
          paintGradientAcross(q("[data-hero-mark]")[0], chars, gradientToken("--grad-title"));

          /* ── abertura ──────────────────────────────────────────────────── */
          let intro = null;

          // Só na primeira montagem: um rebuild por resize não reabre o site.
          if (reduce || introPlayed.current) {
            gsap.set([...chars, ...kicker], {
              autoAlpha: 1,
              yPercent: 0,
              y: 0,
              scale: 1,
              filter: "blur(0px)",
            });
            gsap.set(q("[data-hero-sub], [data-hero-cue]"), {
              autoAlpha: 1,
              y: 0,
              filter: "blur(0px)",
            });
            gsap.set(q("[data-hero-glow]"), { autoAlpha: 1, scale: 1 });
          } else {
            introPlayed.current = true;
            intro = gsap.timeline({ defaults: { ease: "power3.out" } });

            intro
              .fromTo(
                q("[data-hero-glow]"),
                { autoAlpha: 0, scale: 0.86 },
                { autoAlpha: 1, scale: 1, duration: 2.4, ease: "power2.out" },
                0
              )
              .fromTo(
                kicker,
                { autoAlpha: 0, y: 14, filter: "blur(10px)" },
                { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.3 },
                0.1
              )
              .fromTo(
                chars,
                { autoAlpha: 0, yPercent: 34, scale: 1.04, filter: "blur(14px)" },
                {
                  autoAlpha: 1,
                  yPercent: 0,
                  scale: 1,
                  filter: "blur(0px)",
                  duration: 1.5,
                  stagger: 0.075,
                },
                0.28
              )
              .fromTo(
                q("[data-hero-sub]"),
                { autoAlpha: 0, y: 18, filter: "blur(8px)" },
                { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.2 },
                "-=0.85" // sobreposição: nada acontece em bloco
              )
              .fromTo(
                q("[data-hero-cue]"),
                { autoAlpha: 0, y: 12 },
                { autoAlpha: 1, y: 0, duration: 1 },
                "-=0.7"
              );
          }

          // Respiro do indicador: movimento mínimo, só para dizer "há mais".
          if (!reduce) {
            gsap.to(q("[data-hero-arrow]"), {
              y: 5,
              duration: 1.5,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
              delay: intro ? 2.6 : 0,
            });
          }

          /* ── timeline mestre: uma só, com scrub, cobrindo o trilho inteiro.
                Assim tudo é reversível de graça — subir desfaz descer. ────── */
          const tl = gsap.timeline({
            defaults: { ease: "none" }, // em scrub, o tempo é do usuário
            scrollTrigger: {
              trigger: track.current,
              start: "top top",
              end: "bottom bottom",
              scrub: true, // o Lenis já suaviza o input; não suavizar duas vezes
              onUpdate: () => {
                // Rolou durante a abertura: acelera em vez de cortar seco.
                if (intro?.isActive()) intro.timeScale(2.6);
              },
            },
          });

          // Fixa a duração total em 1 para que as marcas sejam fração do trilho.
          tl.to({}, { duration: 1 }, 0);

          if (!reduce) {
            tl.fromTo(q(".stage__media"), { scale: 1.06 }, { scale: 1, duration: 1 }, 0);
          }

          /* A luz: discreta na abertura, no auge no meio da hero, recuando na
             saída. Anima só o CONTÊINER — os uniforms do shader ficam quietos
             e o framerate não paga pelo efeito. */
          const { rays } = MARKS;
          tl.fromTo(
            q(".stage__rays"),
            { opacity: 0.14, scale: 1.26, yPercent: 9 },
            { opacity: 1, scale: 1.05, yPercent: 0, duration: rays.in[1] - rays.in[0] },
            rays.in[0]
          )
            .to(
              q(".stage__rays"),
              { scale: 1, duration: rays.peak[1] - rays.peak[0] },
              rays.peak[0]
            )
            .to(
              q(".stage__rays"),
              { opacity: 0, scale: 1.12, duration: rays.out[1] - rays.out[0] },
              rays.out[0]
            );

          // A poeira estoura em branco: a cortina fecha na mesma medida.
          tl.fromTo(
            q(".stage__scrim"),
            { opacity: 0.1 },
            { opacity: 0.58, duration: MARKS.scrim[1] - MARKS.scrim[0] },
            MARKS.scrim[0]
          );

          /* Saída da hero — .to() captura o estado atual, então convive com
             a abertura sem duplicar valores. */
          tl.to(
            q("[data-hero-cue]"),
            { autoAlpha: 0, y: -10, duration: MARKS.cue[1] - MARKS.cue[0] },
            MARKS.cue[0]
          );

          const span = MARKS.heroExit[1] - MARKS.heroExit[0];

          tl.to(
            chars,
            {
              autoAlpha: 0,
              yPercent: -46,
              scale: 1.06,
              filter: haze ? "blur(12px)" : "none",
              stagger: span * 0.06,
              duration: span,
            },
            MARKS.heroExit[0]
          )
            .to(kicker, { autoAlpha: 0, y: -22, duration: span * 0.6 }, MARKS.heroExit[0])
            .to(
              q("[data-hero-sub]"),
              { autoAlpha: 0, y: -28, duration: span * 0.7 },
              MARKS.heroExit[0] + span * 0.12
            )
            .to(q("[data-hero-glow]"), { autoAlpha: 0, duration: span }, MARKS.heroExit[0]);

          // Corte para preto: cobre a emenda com a primeira seção.
          tl.fromTo(
            q(".stage__blackout"),
            { opacity: 0 },
            { opacity: 1, duration: MARKS.blackout[1] - MARKS.blackout[0] },
            MARKS.blackout[0]
          );
        }
      );

      return () => mm.revert();
    },
    { scope: track, dependencies: [fontsReady, tier, width], revertOnUpdate: true }
  );

  return (
    <section
      className="track"
      id="topo"
      ref={track}
      style={{ height: `${TRACK_VH}vh` }}
      aria-label="Agência Prime — abertura"
    >
      <div className="stage" data-tier={tier}>
        <img
          className="stage__media stage__poster"
          src={POSTER}
          alt=""
          decoding="async"
          fetchPriority="high"
        />

        {hasVideo && (
          <video
            ref={video}
            className="stage__media stage__video"
            src={source.src}
            poster={POSTER}
            muted
            playsInline
            preload="auto"
            disablePictureInPicture
            tabIndex={-1}
            aria-hidden="true"
          />
        )}

        {tier !== "static" && (
          <div className="stage__layer stage__rays">
            <Rays level={0.72} offsetY={-0.42} />
          </div>
        )}

        <div className="stage__layer stage__gold" aria-hidden="true" />
        <div className="stage__layer stage__scrim" aria-hidden="true" />
        <div className="stage__layer stage__vignette" aria-hidden="true" />
        <div className="stage__layer stage__grain" aria-hidden="true" />
        <div className="stage__layer stage__blackout" aria-hidden="true" />

        <div className="stage__content">
          <Hero />
        </div>
      </div>
    </section>
  );
}
