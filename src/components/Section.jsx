import { Fragment } from "react";
import { Mark, Underline } from "./Marks";
import { useMagnetic } from "../hooks/useMagnetic";

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

function Label({ children }) {
  return (
    <p className="sec__label" data-sec-label>
      <span className="sec__label-dot" aria-hidden="true" />
      {children}
    </p>
  );
}

/**
 * Botão com dupla de texto: uma cópia sai por cima enquanto a outra entra por
 * baixo. Trocar só a cor seria feedback; isto é gesto.
 * O contêiner externo é o que o ímã move — o interno anda menos, e a diferença
 * entre os dois é o que dá peso.
 */
function MagneticButton({ href, label }) {
  const ref = useMagnetic({ strength: 0.28, radius: 120 });

  return (
    <a className="btn" href={href} ref={ref} data-cursor="button" data-sec-item>
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

/* ── Layouts ──────────────────────────────────────────────────────────────
   Cada um tem uma composição e uma interação-assinatura. Repetir o mesmo
   bloco sete vezes é justamente o que faz uma página parecer template. */

function LayoutSplit({ section }) {
  const { id, title, body } = section;
  return (
    <div className="sec__split">
      {/* Camadas com velocidades diferentes: é o que cria a profundidade. */}
      <div data-parallax="mid">
        <Title lines={title} id={id} />
      </div>
      <div className="sec__aside" data-parallax="detail">
        <span className="sec__hair" data-sec-hair aria-hidden="true" />
        <p className="sec__body" data-sec-body>
          <Rich parts={body} />
        </p>
      </div>
    </div>
  );
}

/**
 * Serviços: lista vertical em que o item apontado se abre e a marca em traço
 * correspondente acompanha o cursor com atraso. A lista inteira escurece
 * menos o item ativo — o foco é do leitor, não do layout.
 */
function LayoutServices({ section }) {
  const { items } = section;
  return (
    <>
      <ul className="services" data-services>
        {items.map((item, i) => (
          <li className="service" data-sec-item data-service={item.mark} key={item.name}>
            <span className="service__rule" data-sec-rule aria-hidden="true" />
            <a className="service__row" href={`#contato`} data-cursor="view" data-cursor-text="Ver">
              <span className="service__num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="service__name">{item.name}</span>
              <span className="service__text">{item.text}</span>
              <span className="service__go" aria-hidden="true">
                →
              </span>
            </a>
          </li>
        ))}
      </ul>

      {/* Uma marca por serviço, empilhadas; só a ativa acende. */}
      <div className="services__preview" data-services-preview aria-hidden="true">
        {items.map((item) => (
          <span className="services__mark" data-preview={item.mark} key={item.mark}>
            <Mark name={item.mark} />
          </span>
        ))}
      </div>
    </>
  );
}

function LayoutGlyphs({ section }) {
  const { items } = section;
  return (
    <ul className="sec__glyphs">
      {items.map((item, i) => (
        <li
          className="glyph"
          data-sec-item
          /* Colunas alternadas andam em velocidades diferentes: o grid deixa
             de ser uma fileira e passa a ter espessura. */
          data-parallax={i % 2 === 0 ? "front" : "detail"}
          key={item.name}
        >
          <Mark name={item.mark} />
          <h3 className="glyph__name">{item.name}</h3>
          <p className="glyph__text">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Processo: storytelling preso. O título e o contador ficam à esquerda
 * enquanto as etapas passam à direita — o leitor sente que atravessa o
 * processo em vez de ler uma lista dele.
 */
function LayoutProcess({ section }) {
  const { id, title, body, items } = section;
  return (
    <div className="process">
      <div className="process__sticky">
        <Label>{section.label}</Label>
        <Title lines={title} id={id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={body} />
        </p>
        <p className="process__count" aria-hidden="true">
          <span data-process-current>01</span>
          <span className="process__count-sep">/</span>
          <span>{String(items.length).padStart(2, "0")}</span>
        </p>
      </div>

      <ol className="process__steps">
        {items.map((item, i) => (
          <li className="step" data-sec-item data-step={i} key={item.name}>
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
    </div>
  );
}

/**
 * Entregas: faixa horizontal presa. O scroll vertical vira deslocamento
 * lateral — o segundo grande momento da página, e o único lugar em que o
 * eixo do movimento muda.
 */
function LayoutDeliverables({ section }) {
  const { items } = section;
  return (
    <div className="rail" data-rail>
      <div className="rail__track" data-rail-track>
        {items.map((item, i) => (
          <article className="deliverable" data-sec-item key={item.name}>
            <span className="deliverable__num" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="deliverable__name">{item.name}</h3>
            <p className="deliverable__text">{item.text}</p>
            <span className="deliverable__rule" data-sec-rule aria-hidden="true" />
          </article>
        ))}
      </div>
    </div>
  );
}

export default function Section({ section }) {
  const { id, layout, theme, label, title, body, cta } = section;

  /* O processo monta o próprio cabeçalho dentro da coluna presa. */
  const cabecalhoProprio = layout === "process";

  return (
    <section
      className={`sec sec--${layout}`}
      id={id}
      data-sec={id}
      data-theme={theme}
      data-layout={layout}
      aria-labelledby={`${id}-titulo`}
    >
      {/* Brilho atrás do fecho, aceso pelo scroll. Fora do `sec__inner`
          porque o inner é escalado e desfocado pela animação do CTA — o
          brilho precisa ficar de fora para não herdar o blur. */}
      {layout === "cta" && <span className="sec__glow" data-cta-glow aria-hidden="true" />}

      <div className="sec__inner">
        {!cabecalhoProprio && <Label>{label}</Label>}

        {layout === "split" && <LayoutSplit section={section} />}

        {!cabecalhoProprio && layout !== "split" && (
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

        {layout === "services" && <LayoutServices section={section} />}
        {layout === "glyphs" && <LayoutGlyphs section={section} />}
        {layout === "process" && <LayoutProcess section={section} />}
        {layout === "deliverables" && <LayoutDeliverables section={section} />}

        {layout === "cta" && (
          <div className="sec__cta">
            <MagneticButton href={cta.href} label={cta.label} />
          </div>
        )}
      </div>
    </section>
  );
}
