import { Fragment } from "react";
import { useMagnetic } from "../hooks/useMagnetic";

/**
 * As peças de tipografia que todas as seções reutilizam.
 *
 * Vivem em arquivo próprio porque agora existem onze seções e cinco delas têm
 * componente separado: deixá-las dentro de Section.jsx obrigaria cada frente
 * a importar o arquivo do roteador de layouts, e o ciclo de import apareceria
 * na primeira que precisasse de um título.
 */

const TOM = { gold: "em", bright: "strong" };

/** Texto rico do conteúdo: destaque é decisão editorial, não enfeite. */
export function Rich({ parts }) {
  return parts.map((part, i) => {
    const Tag = TOM[part.tone];
    return Tag ? <Tag key={i}>{part.text}</Tag> : <Fragment key={i}>{part.text}</Fragment>;
  });
}

export function Title({ lines, id, className = "sec__title" }) {
  return (
    <h2
      className={className}
      id={`${id}-titulo`}
      data-sec-title
      /* O <br> desaparece quando o SplitText reescreve o nó e as linhas
         grudam na leitura em voz alta. O rótulo vem do conteúdo. */
      aria-label={lines.join(" ")}
    >
      {/* Quebra explícita: deixar o navegador quebrar orfana a palavra curta
          e desmonta a composição. */}
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {line}
        </Fragment>
      ))}
    </h2>
  );
}

export function Label({ children }) {
  return (
    <p className="sec__label" data-sec-label>
      <span className="sec__label-dot" aria-hidden="true" />
      {children}
    </p>
  );
}

/**
 * Cabeçalho de uma frente: número grande e nome. Substitui o rótulo comum
 * nas cinco seções de serviço — ali o número é o que dá a sensação de índice
 * percorrido, e não uma etiqueta genérica repetida cinco vezes.
 */
export function Numero({ numero, nome }) {
  return (
    <p className="frente-tag" data-sec-label>
      <span className="frente-tag__num" aria-hidden="true">
        {numero}
      </span>
      <span className="frente-tag__nome">{nome}</span>
    </p>
  );
}

/**
 * Botão com dupla de texto: uma cópia sai por cima enquanto a outra entra por
 * baixo. Trocar só a cor seria feedback; isto é gesto.
 * O contêiner externo é o que o ímã move — o interno anda menos, e a diferença
 * entre os dois é o que dá peso.
 */
export function MagneticButton({ href, label, externo = false }) {
  const ref = useMagnetic({ strength: 0.28, radius: 120 });
  const extra = externo ? { target: "_blank", rel: "noreferrer noopener" } : {};

  return (
    <a className="btn" href={href} ref={ref} data-cursor="button" {...extra}>
      <span className="btn__inner" data-magnetic-inner>
        <span className="btn__text">
          <span className="btn__line">{label}</span>
          <span className="btn__line btn__line--ghost" aria-hidden="true">
            {label}
          </span>
        </span>
        <span className="btn__arrow" aria-hidden="true">
          →
        </span>
      </span>
    </a>
  );
}
