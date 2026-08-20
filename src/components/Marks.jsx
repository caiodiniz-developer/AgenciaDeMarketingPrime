/**
 * Marcas em traço, desenhadas na entrada da seção.
 *
 * Todas seguem as mesmas regras para que uma animação só dê conta de todas:
 *   · viewBox 0 0 96 96, sem `fill`, só `stroke`
 *   · cada traço leva `data-draw` — o DrawSVGPlugin risca do começo ao fim
 *   · cada acento leva `data-pop` — aparece por escala, depois do traço
 *   · a espessura vem de `vector-effect: non-scaling-stroke`, então o mesmo
 *     desenho serve a qualquer tamanho sem engordar a linha
 */

const BASE = {
  viewBox: "0 0 96 96",
  fill: "none",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
};

/** Estratégia — mira: decidir onde jogar antes de decidir como aparecer. */
function Estrategia(props) {
  return (
    <svg {...BASE} {...props} aria-hidden="true">
      <circle data-draw cx="48" cy="48" r="34" />
      <circle data-draw cx="48" cy="48" r="20" />
      <path data-draw d="M48 6v18M48 72v18M6 48h18M72 48h18" />
      <circle data-pop cx="48" cy="48" r="5" className="mark__accent" />
    </svg>
  );
}

/** Identidade — dois planos que se sobrepõem e formam um terceiro. */
function Identidade(props) {
  return (
    <svg {...BASE} {...props} aria-hidden="true">
      <rect data-draw x="12" y="12" width="48" height="48" rx="4" />
      <circle data-draw cx="60" cy="60" r="24" />
      <path data-pop d="M36 36h24v24" className="mark__accent" />
    </svg>
  );
}

/** Experiência — o percurso: entra num ponto, sai transformado noutro. */
function Experiencia(props) {
  return (
    <svg {...BASE} {...props} aria-hidden="true">
      <path data-draw d="M10 70C24 70 26 26 48 26s24 44 38 44" />
      <path data-draw d="M10 44h14M72 52h14" opacity="0.55" />
      <circle data-pop cx="10" cy="70" r="4" className="mark__accent" />
      <circle data-pop cx="86" cy="70" r="4" className="mark__accent" />
    </svg>
  );
}

/** Inovação — a faísca: o caminho novo quando o óbvio já saturou. */
function Inovacao(props) {
  return (
    <svg {...BASE} {...props} aria-hidden="true">
      <path data-draw d="M48 10v22M48 64v22M10 48h22M64 48h22" />
      <path data-draw d="M21 21l16 16M59 59l16 16M75 21L59 37M37 59l-16 16" opacity="0.55" />
      <circle data-draw cx="48" cy="48" r="14" />
      <path data-pop d="M44 48l3 4 6-8" className="mark__accent" />
    </svg>
  );
}

export const MARKS_BY_ID = {
  estrategia: Estrategia,
  identidade: Identidade,
  experiencia: Experiencia,
  inovacao: Inovacao,
};

export function Mark({ name, className = "" }) {
  const Glyph = MARKS_BY_ID[name];
  if (!Glyph) return null;
  return <Glyph className={`mark ${className}`} data-mark={name} />;
}

/**
 * Régua do manifesto: um traço longo com um nó no meio.
 * Serve de assinatura sob a frase — desenha da esquerda para a direita.
 */
export function Underline({ className = "" }) {
  return (
    <svg
      className={`underline ${className}`}
      viewBox="0 0 640 40"
      fill="none"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-underline
    >
      <path
        data-draw
        d="M4 28C120 28 168 10 236 10s112 20 176 20 108-20 176-20 44 18 48 18"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
