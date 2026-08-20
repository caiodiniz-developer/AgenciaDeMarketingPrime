import { useEffect } from "react";
import { gsap, ScrollTrigger } from "../lib/gsap";

/** Interpolação estável em qualquer framerate. */
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.pow(1 - lambda, dt * 60));

/**
 * Liga o `currentTime` do vídeo à posição do scroll no trilho.
 * Descer avança os quadros, subir recua. Nunca dá play.
 *
 * Três detalhes separam "manteiga" de "travado", e os três são obrigatórios:
 *   1. o tempo aplicado PERSEGUE o alvo (ligar o scroll direto no currentTime
 *      transforma cada tique da roda num seek e o decoder engasga);
 *   2. arredonda para o quadro;
 *   3. só escreve quando o quadro muda — seeks que não mudariam nada na tela
 *      são descartados.
 */
export function useVideoScrub({ videoRef, trackRef, fps = 30, enabled = true }) {
  useEffect(() => {
    const video = videoRef.current;
    const track = trackRef.current;
    if (!enabled || !video || !track) return;

    let duration = 0;
    let target = 0;
    let current = 0;
    let lastFrame = -1;
    let primed = false;

    const readDuration = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        duration = video.duration;
        ScrollTrigger.refresh();
      }
    };

    if (video.readyState >= 1) readDuration();
    video.addEventListener("loadedmetadata", readDuration);

    const trigger = ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        target = self.progress * duration;
      },
      onRefresh: (self) => {
        target = self.progress * duration;
        // Ao entrar no meio da página (reload, deep link), não persegue:
        // salta direto, senão o vídeo corre segundos de uma vez.
        if (!primed && duration) {
          primed = true;
          current = target;
          lastFrame = -1;
        }
      },
    });

    const tick = (_time, deltaTime) => {
      if (!duration || video.readyState < 1) return;

      // dt limitado: uma aba que voltou do background traria um salto enorme.
      current = damp(current, target, 0.18, Math.min(deltaTime, 50) / 1000);

      const frame = Math.round(current * fps);
      if (frame === lastFrame) return;
      lastFrame = frame;

      // Meio do quadro: garante que o decoder caia DENTRO do quadro pedido.
      video.currentTime = Math.min(duration - 1 / fps, (frame + 0.5) / fps);
    };

    gsap.ticker.add(tick);

    // iOS só libera mexer no currentTime depois de um gesto. Destrava uma vez.
    const unlock = () => {
      const p = video.play();
      if (p) p.then(() => video.pause()).catch(() => {});
    };
    window.addEventListener("touchstart", unlock, { once: true, passive: true });
    window.addEventListener("pointerdown", unlock, { once: true });

    return () => {
      gsap.ticker.remove(tick);
      trigger.kill();
      video.removeEventListener("loadedmetadata", readDuration);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("pointerdown", unlock);
    };
  }, [videoRef, trackRef, fps, enabled]);
}
