import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap";
import { EASE } from "../lib/motion";
import { useMagnetic } from "../hooks/useMagnetic";
import { prefersReducedMotion } from "../lib/media";
import { CONTATO } from "../content/story";

/**
 * Botão flutuante de WhatsApp.
 *
 * Dourado e não verde: o verde do WhatsApp é a identidade DELES, e um selo
 * verde no canto de uma página preta e dourada lê como plugin instalado, não
 * como parte do site.
 *
 * Só aparece depois da hero — durante a abertura, a tela pertence ao wordmark
 * — e dá um único pulso ao chegar. Pulso em laço infinito no canto da tela
 * vira mosquito: o olho persegue e não larga.
 */
export default function Whatsapp() {
  const [visivel, setVisivel] = useState(false);
  const caixa = useRef(null);
  const ima = useMagnetic({ strength: 0.24, radius: 90, textStrength: 0.5 });

  useEffect(() => {
    const onScroll = () => {
      const track = document.querySelector(".track");
      const limiar = track
        ? track.offsetHeight - window.innerHeight * 1.15
        : window.innerHeight * 0.9;
      setVisivel(window.scrollY > limiar);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useGSAP(
    () => {
      if (!caixa.current || !visivel || prefersReducedMotion()) return;

      gsap
        .timeline()
        .fromTo(
          caixa.current,
          { autoAlpha: 0, scale: 0.4 },
          { autoAlpha: 1, scale: 1, duration: 0.6, ease: EASE.out }
        )
        // Um pulso só, depois de assentar: diz "estou aqui" e cala a boca.
        .to(caixa.current, { scale: 1.08, duration: 0.35, ease: EASE.out }, "+=0.9")
        .to(caixa.current, { scale: 1, duration: 0.5, ease: EASE.out });
    },
    { dependencies: [visivel], scope: caixa }
  );

  return (
    <div className="zap" ref={caixa} data-visivel={visivel}>
      <a
        className="zap__botao"
        ref={ima}
        href={CONTATO.whatsapp.link}
        target="_blank"
        rel="noreferrer noopener"
        aria-label={`Falar com a Prime no WhatsApp: ${CONTATO.whatsapp.exibicao}`}
        data-cursor="button"
      >
        <span className="zap__interno" data-magnetic-inner>
          <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M16.03 4.5c-6.35 0-11.5 5.15-11.5 11.5 0 2.03.53 4.01 1.55 5.76L4.5 27.5l5.9-1.54a11.45 11.45 0 0 0 5.63 1.44h.01c6.34 0 11.5-5.15 11.5-11.5 0-3.07-1.2-5.96-3.37-8.13a11.42 11.42 0 0 0-8.14-3.27Zm0 21.05h-.01a9.56 9.56 0 0 1-4.87-1.33l-.35-.21-3.5.92.93-3.41-.23-.36a9.53 9.53 0 0 1-1.46-5.09c0-5.27 4.29-9.56 9.57-9.56 2.55 0 4.95 1 6.76 2.8a9.5 9.5 0 0 1 2.8 6.77c0 5.28-4.3 9.57-9.64 9.57Zm5.25-7.16c-.29-.15-1.7-.84-1.96-.93-.26-.1-.45-.15-.64.14-.19.29-.74.93-.9 1.12-.17.19-.33.22-.62.07-.29-.14-1.21-.44-2.31-1.42-.85-.76-1.43-1.7-1.6-1.99-.16-.29-.01-.44.13-.59.13-.13.29-.34.43-.5.15-.17.19-.29.29-.48.1-.2.05-.36-.02-.51-.07-.14-.64-1.55-.88-2.12-.23-.55-.47-.48-.64-.49h-.55c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38s1.02 2.76 1.17 2.95c.14.19 2.01 3.07 4.88 4.3.68.3 1.21.47 1.63.6.68.22 1.31.19 1.8.11.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.34Z"
            />
          </svg>
        </span>
      </a>
    </div>
  );
}
