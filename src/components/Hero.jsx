import { HERO } from "../content/story";

/**
 * Composição centralizada no viewport: assinatura, wordmark e convite.
 * Nada além disso — a primeira impressão é o gradiente sobre o quadro preto.
 *
 * O wordmark é um bloco de duas alturas: "AGÊNCIA" abre a leitura e "PRIME"
 * carrega a presença. Numa linha só, o nome inteiro teria menos da metade
 * do corpo e a hero perderia o impacto que o título precisa ter.
 *
 * Cada letra é um span próprio: o gradiente é pintado por fatia
 * (lib/gradientText.js) e a saída anima letra a letra.
 */
export default function Hero() {
  const [kicker, mark] = HERO.wordmark.split(" ");

  return (
    <div className="hero" data-hero>
      <div className="hero__inner">
        <div className="hero__glow" data-hero-glow aria-hidden="true" />

        <h1 className="hero__title" data-hero-title>
          <span className="sr-only">{HERO.wordmark}</span>

          <span className="hero__kicker" data-hero-kicker aria-hidden="true">
            {kicker}
          </span>

          <span className="hero__mark" data-hero-mark aria-hidden="true">
            {mark.split("").map((char, i) => (
              <span className="hero__char" data-hero-char key={i}>
                {char}
              </span>
            ))}
          </span>
        </h1>

        <p className="hero__sub" data-hero-sub>
          {HERO.tagline}
        </p>

        <div className="hero__cue" data-hero-cue>
          <span className="hero__cue-rule" aria-hidden="true" />
          <span className="hero__cue-label">
            {HERO.cue}
            <span className="hero__cue-arrow" data-hero-arrow aria-hidden="true">
              ↓
            </span>
          </span>
          <span className="hero__cue-rule hero__cue-rule--right" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
