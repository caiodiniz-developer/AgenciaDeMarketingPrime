import { Rich, Title, Label, MagneticButton } from "./Peca";
import { servicos, servicoPorId, CONTATO } from "../content/story";
import { videoDaFrente } from "../lib/media";
import ServicoSocial from "./ServicoSocial";
import ServicoWeb from "./ServicoWeb";
import ServicoDesign from "./ServicoDesign";
import ServicoBranding from "./ServicoBranding";
import ServicoEstrategia from "./ServicoEstrategia";
import Maquina from "./Maquina";
import SistemaPrime from "./SistemaPrime";
import Clientes from "./Clientes";
import Retrato from "./Retrato";

/* ── Layouts ──────────────────────────────────────────────────────────────
   Cada um tem composição e interação-assinatura próprias, e nenhuma se
   repete. Repetir o mesmo bloco cinco vezes é o que faz uma página parecer
   template — inclusive quando o bloco é bonito. */

/**
 * Manifesto: o problema dito em texto e depois em uma palavra só, atravessando
 * a tela. É o respiro entre a hero e a parte densa — e o momento em que o
 * leitor deve pensar "talvez isso seja comigo".
 */
function LayoutManifesto({ section }) {
  const { id, title, body, palavra } = section;
  return (
    <>
      <div className="manif">
        <Label>{section.label}</Label>

        {/* O título ocupa a largura inteira: espremido numa coluna, as duas
            linhas escritas viravam quatro e a frase perdia o soco. */}
        <div className="manif__titulo" data-parallax="mid">
          <Title lines={title} id={id} />
        </div>

        <div className="manif__aside" data-parallax="detail">
          <span className="sec__hair" data-sec-hair aria-hidden="true" />
          <p className="sec__body" data-sec-body>
            <Rich parts={body} />
          </p>
        </div>
      </div>

      {/* A palavra corre em faixa, conduzida pelo scroll: vira textura.
          Quatro cópias porque a faixa precisa emendar sem buraco. */}
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
 * Índice: a porta de entrada das cinco frentes.
 *
 * Não é um menu — é um aviso do tamanho do que vem. Apontar uma linha traz o
 * vídeo real daquela frente para o fundo; clicar leva à seção. As cinco
 * seções seguintes são o desenvolvimento deste índice.
 */
function LayoutIndice({ section }) {
  return (
    <div className="indice" data-indice-frentes>
      <div className="indice__fundo" aria-hidden="true">
        {servicos.map((s) => {
          const v = videoDaFrente(s.video);
          return (
            <video
              className="indice__video"
              data-indice-video={s.id}
              key={s.id}
              src={v.src}
              poster={v.poster}
              muted
              loop
              playsInline
              preload="none"
              disablePictureInPicture
              tabIndex={-1}
            />
          );
        })}
        <span className="indice__scrim" />
      </div>

      <div className="indice__texto">
        <Label>{section.label}</Label>
        <Title lines={section.title} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={section.body} />
        </p>
      </div>

      <ol className="indice__lista">
        {servicos.map((s, i) => (
          <li className="linha" data-sec-item data-linha={s.id} data-indice={i} key={s.id}>
            <span className="linha__rule" data-sec-rule aria-hidden="true" />
            <a className="linha__alvo" href={`#${s.id}`} data-cursor="view" data-cursor-text="Ver">
              <span className="linha__num" aria-hidden="true">
                {s.numero}
              </span>
              <span className="linha__nome">{s.nome}</span>
              <span className="linha__legenda">{s.linha}</span>
              <span className="linha__seta" aria-hidden="true">
                ↓
              </span>
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Roteador das cinco frentes: cada uma é um componente inteiro. */
const FRENTES = {
  social: ServicoSocial,
  web: ServicoWeb,
  design: ServicoDesign,
  branding: ServicoBranding,
  estrategia: ServicoEstrategia,
};

export default function Section({ section }) {
  const { id, layout, theme, label, title, body, cta, servico } = section;
  const Frente = servico ? FRENTES[servico] : null;
  const dados = servico ? servicoPorId(servico) : null;

  /* Estas montam o próprio cabeçalho, dentro da composição delas. */
  const cabecalhoProprio =
    Boolean(Frente) ||
    ["manifesto", "indice", "maquina", "sistema", "clientes", "retrato"].includes(layout);

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

        {layout === "manifesto" && <LayoutManifesto section={section} />}
        {layout === "indice" && <LayoutIndice section={section} />}
        {Frente && <Frente section={section} servico={dados} />}
        {layout === "maquina" && <Maquina section={section} />}
        {layout === "sistema" && <SistemaPrime section={section} />}
        {layout === "clientes" && <Clientes section={section} />}
        {layout === "retrato" && <Retrato section={section} />}

        {!cabecalhoProprio && (
          <>
            <Title lines={title} id={id} />
            <p className="sec__body" data-sec-body>
              <Rich parts={body} />
            </p>
          </>
        )}

        {layout === "cta" && (
          <div className="sec__cta" data-sec-item>
            <MagneticButton href={cta.href} label={cta.label} externo />
            <p className="sec__cta-alt">
              ou escreva para{" "}
              <a href={`mailto:${CONTATO.email}`} data-cursor="link">
                {CONTATO.email}
              </a>
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
