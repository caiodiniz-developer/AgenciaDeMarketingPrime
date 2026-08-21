import { Fragment } from "react";
import { Mark, Underline } from "./Marks";

const TONE_TAG = { gold: "em", bright: "strong" };

/** Texto rico do conteúdo: destaque é decisão editorial, não enfeite. */
function Rich({ parts }) {
  return parts.map((part, i) => {
    const Tag = TONE_TAG[part.tone];
    return Tag ? <Tag key={i}>{part.text}</Tag> : <Fragment key={i}>{part.text}</Fragment>;
  });
}

function Title({ lines, id }) {
  return (
    <h2
      className="sec__title"
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

/**
 * Uma seção da narrativa. Cada `layout` tem composição própria — repetir o
 * mesmo bloco sete vezes é justamente o que faz uma página parecer template.
 * Só markup: a coreografia vive no Story.
 */
export default function Section({ section }) {
  const { id, layout, theme, label, title, body, items, cta } = section;

  return (
    <section
      className={`sec sec--${layout}`}
      id={id}
      data-sec={id}
      data-theme={theme}
      aria-labelledby={`${id}-titulo`}
    >
      <div className="sec__inner">
        <p className="sec__label" data-sec-label>
          <span className="sec__label-dot" aria-hidden="true" />
          {label}
        </p>

        {layout === "split" ? (
          <div className="sec__split">
            <Title lines={title} id={id} />
            <div className="sec__aside">
              <span className="sec__hair" data-sec-hair aria-hidden="true" />
              <p className="sec__body" data-sec-body>
                <Rich parts={body} />
              </p>
            </div>
          </div>
        ) : (
          <>
            <Title lines={title} id={id} />
            <p className="sec__body" data-sec-body>
              <Rich parts={body} />
            </p>
          </>
        )}

        {layout === "statement" && (
          <div className="sec__underline" data-sec-item>
            <Underline />
          </div>
        )}

        {layout === "grid" && (
          <ul className="sec__grid">
            {items.map((item) => (
              <li className="card" data-sec-item key={item.name}>
                <h3 className="card__name">{item.name}</h3>
                <p className="card__text">{item.text}</p>
              </li>
            ))}
          </ul>
        )}

        {layout === "glyphs" && (
          <ul className="sec__glyphs">
            {items.map((item) => (
              <li className="glyph" data-sec-item key={item.name}>
                <Mark name={item.mark} />
                <h3 className="glyph__name">{item.name}</h3>
                <p className="glyph__text">{item.text}</p>
              </li>
            ))}
          </ul>
        )}

        {layout === "steps" && (
          <ol className="sec__steps">
            {items.map((item, i) => (
              <li className="step" data-sec-item key={item.name}>
                <span className="step__num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="step__name">{item.name}</h3>
                  <p className="step__text">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {layout === "list" && (
          <ul className="sec__list">
            {items.map((item) => (
              <li className="row" data-sec-item key={item.name}>
                <span className="row__rule" data-sec-rule aria-hidden="true" />
                <h3 className="row__name">{item.name}</h3>
                <p className="row__text">{item.text}</p>
              </li>
            ))}
          </ul>
        )}

        {layout === "cta" && (
          <div className="sec__cta" data-sec-item>
            <a className="btn" href={cta.href}>
              <span>{cta.label}</span>
              <span className="btn__arrow" aria-hidden="true">
                →
              </span>
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
