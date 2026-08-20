import { memo } from "react";
import { GodRays } from "@paper-design/shaders-react";
import { prefersReducedMotion } from "../lib/media";

/**
 * A luz da cena. Não é um efeito por cima: fica ENTRE o vídeo e os overlays,
 * de modo que os gradientes e a vinheta caem sobre ela como cairiam sobre
 * qualquer outra fonte de luz do quadro.
 *
 * Quem anima é sempre o CONTÊINER (opacity/scale/translate, via GSAP) —
 * mexer nos uniforms a cada quadro de scroll recompila trabalho à toa.
 * O `level` é quantizado por quem chama, então este componente re-renderiza
 * poucas vezes ao longo de toda a página.
 */
function RaysImpl({ className = "", level = 1, warm = false, offsetY = -0.55 }) {
  const still = prefersReducedMotion();

  return (
    <div className={`rays ${className}`} aria-hidden="true">
      <GodRays
        className="rays__shader"
        width="100%"
        height="100%"
        // Teto de resolução: fullscreen em 4K sem isto derruba o framerate.
        maxPixelCount={1920 * 1080}
        minPixelRatio={1}
        colors={
          warm
            ? ["#c9a84c40", "#d8b96aa6", "#f6ead0", "#b9963f"]
            : ["#c9a84c33", "#cfae5c99", "#efe2c6", "#a8873a"]
        }
        colorBack="#00000000"
        colorBloom="#c9a84c"
        bloom={0.22 + level * 0.16}
        intensity={0.18 + level * 0.34}
        density={0.26}
        spotty={0.28}
        midSize={0.18}
        midIntensity={0.22 + level * 0.2}
        // reduced-motion pede o fim do movimento autônomo: a luz fica parada,
        // mas continua existindo e continua respondendo ao scroll.
        speed={still ? 0 : 0.34}
        offsetY={offsetY}
      />
    </div>
  );
}

export default memo(RaysImpl);
