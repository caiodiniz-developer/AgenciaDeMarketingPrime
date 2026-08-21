import { Fragment } from "react";
import { useMagnetic } from "../hooks/useMagnetic";
import { servicos } from "../content/story";
import ServiceStage from "./ServiceStage";
import SystemScene from "./SystemScene";
import Computer from "./Computer";
import Clientes from "./Clientes";
import { POSTER, sourceFor, pickTier } from "../lib/media";

const TONE_TAG = { gold: "em", bright: "strong" };

/** Texto rico do conteúdo: destaque é decisão editorial, não enfeite. */
function Rich({ parts }) {
  return parts.map((part, i) => {
    const Tag = TONE_TAG[part.tone];
    return Tag ? <Tag key={i}>{part.text}</Tag> : <Fragment key={i}>{part.text}</Fragment>;
  });
}

function Title({ lines, id, className = "sec__title" }) {
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
    <a className="btn" href={href} ref={ref} data-cursor="button">
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
   Cada um tem composição e interação-assinatura próprias, e nenhuma se
   repete. Repetir o mesmo bloco seis vezes é o que faz uma página parecer
   template — inclusive quando o bloco é bonito. */

/**
 * Diagnóstico: o problema dito em texto e depois em uma palavra só,
 * atravessando a tela. É o respiro antes da parte densa.
 */
function LayoutDiagnostico({ section }) {
  const { id, title, body, palavra } = section;
  return (
    <>
      <div className="diag">
        <Label>{section.label}</Label>

        {/* O título ocupa a largura inteira: espremido numa coluna, as duas
            linhas escritas viravam quatro e a frase perdia o soco. */}
        <div className="diag__titulo" data-parallax="mid">
          <Title lines={title} id={id} />
        </div>

        <div className="diag__aside" data-parallax="detail">
          <span className="sec__hair" data-sec-hair aria-hidden="true" />
          <p className="sec__body" data-sec-body>
            <Rich parts={body} />
          </p>
        </div>
      </div>

      {/* A palavra do diagnóstico corre em faixa, conduzida pelo scroll.
          Duas cópias porque a faixa precisa emendar sem buraco. */}
      <div className="faixa" data-faixa aria-hidden="true">
        <div className="faixa__fita" data-faixa-fita>
          {Array.from({ length: 4 }, (_, i) => (
            <span className="faixa__palavra" key={i}>
              {palavra}
              <span className="faixa__ponto" />
            </span>
          ))}
        </div>
      </div>
      <p className="sr-only">{palavra}</p>
    </>
  );
}

/**
 * Serviços: a lista é o conteúdo e o palco é a prova. Apontar uma frente
 * troca a composição ao lado e abre a lista concreta de entregas — que é a
 * resposta para "isso inclui o quê?".
 */
function LayoutServicos() {
  return (
    <div className="frentes" data-frentes>
      <ul className="frentes__lista">
        {servicos.map((s, i) => (
          <li
            className="frente"
            data-sec-item
            data-frente={s.id}
            data-indice={i}
            key={s.id}
          >
            <span className="frente__rule" data-sec-rule aria-hidden="true" />
            <button className="frente__linha" type="button" data-cursor="view" data-cursor-text="Ver">
              <span className="frente__num" aria-hidden="true">
                {s.numero}
              </span>
              <span className="frente__nome">{s.nome}</span>
              <span className="frente__legenda">{s.linha}</span>
            </button>

            {/* Fica no DOM sempre: é conteúdo, não enfeite de hover. No
                mobile ele é a própria lista aberta. */}
            <ul className="frente__entregas">
              {s.entregas.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="frentes__palco" data-frentes-palco>
        <div className="frentes__moldura">
          {servicos.map((s) => (
            <ServiceStage id={s.id} key={s.id} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Audiovisual: o vídeo começa como uma peça no meio da página e, conduzido
 * pelo scroll, toma a tela inteira. A seção prova a capacidade em vez de
 * afirmá-la — e é o único momento em que a página abre mão do texto.
 */
function LayoutFilme({ section }) {
  const { id, title, body } = section;
  const fonte = sourceFor(pickTier());

  return (
    <div className="filme" data-filme>
      <div className="filme__texto" data-filme-texto>
        <Label>{section.label}</Label>
        <Title lines={title} id={id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={body} />
        </p>
      </div>

      <div className="filme__janela" data-filme-janela>
        <video
          className="filme__video"
          data-filme-video
          src={fonte.src || undefined}
          poster={POSTER}
          muted
          loop
          playsInline
          preload="none"
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
        />
        <span className="filme__grade" aria-hidden="true" />
      </div>
    </div>
  );
}

/** Prova: quatro razões, em fio horizontal. Tema claro, leitura calma. */
function LayoutProva({ section }) {
  const { items } = section;
  return (
    <ul className="prova">
      {items.map((item, i) => (
        /* Sem parallax aqui de propósito: deslocar colunas alternadas
           descasaria os fios do grid, e o desalinhamento lê como defeito,
           não como profundidade. Esta seção é o respiro da página. */
        <li className="razao" data-sec-item key={item.name}>
          <span className="razao__rule" data-sec-rule aria-hidden="true" />
          <span className="razao__num" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="razao__nome">{item.name}</h3>
          <p className="razao__texto">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

export default function Section({ section }) {
  const { id, layout, theme, label, title, body, cta } = section;

  /* Estas montam o próprio cabeçalho, dentro da composição delas. */
  const cabecalhoProprio =
    layout === "sistema" || layout === "filme" || layout === "diagnostico" || layout === "digital";

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

        {layout === "diagnostico" && <LayoutDiagnostico section={section} />}
        {layout === "filme" && <LayoutFilme section={section} />}
        {layout === "sistema" && <SystemScene section={section} />}
        {layout === "digital" && <Computer section={section} />}

        {!cabecalhoProprio && (
          <>
            <Title lines={title} id={id} />
            <p className="sec__body" data-sec-body>
              <Rich parts={body} />
            </p>
          </>
        )}

        {layout === "servicos" && <LayoutServicos />}
        {layout === "clientes" && <Clientes section={section} />}
        {layout === "prova" && <LayoutProva section={section} />}

        {layout === "cta" && (
          <div className="sec__cta" data-sec-item>
            <MagneticButton href={cta.href} label={cta.label} />
          </div>
        )}
      </div>
    </section>
  );
}
