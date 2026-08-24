import { Rich, Title, Numero } from "./Peca";
import { videoDaFrente } from "../lib/media";

/**
 * SOCIAL MEDIA — um perfil desenhado, não um álbum de fotos.
 *
 * A versão anterior enchia a grade com quadros do mesmo vídeo. Seis recortes
 * da mesma imagem não parecem um feed: parecem um erro de repetição. Pior,
 * fotografia genérica não prova nada sobre design.
 *
 * Agora cada peça é uma PEÇA GRÁFICA de verdade, desenhada em CSS na
 * identidade da Prime — marca, tipografia, cor, número, grade. É o próprio
 * argumento da seção em forma: "a gente não posta imagem qualquer, a gente
 * desenha o perfil".
 *
 * A interação-assinatura continua: as peças chegam espalhadas e o GSAP Flip
 * as reorganiza num feed. No fim, o feed encolhe e viaja para dentro da tela
 * do notebook, plantando a seção WEB.
 */

/**
 * As nove peças do feed. `tipo` decide o desenho; `rotulo` é o formato que a
 * Prime entrega. Nove, e não seis, porque um feed de Instagram é uma grade de
 * três por três — com seis, a composição não fecha e a referência se perde.
 */
const PECAS = [
  { id: "marca", tipo: "marca", rotulo: "Perfil" },
  { id: "reel", tipo: "reel", rotulo: "Reel" },
  { id: "frase", tipo: "frase", rotulo: "Copy", texto: "Sua marca precisa ser vista." },
  { id: "numero", tipo: "numero", rotulo: "Carrossel", texto: "01" },
  { id: "tipo", tipo: "tipo", rotulo: "Post", texto: "Aa" },
  { id: "cor", tipo: "cor", rotulo: "Identidade" },
  { id: "grade", tipo: "grade", rotulo: "Campanha" },
  { id: "story", tipo: "story", rotulo: "Story" },
  { id: "assinatura", tipo: "assinatura", rotulo: "Assinatura" },
];

/** Os destaques do perfil. São as frentes reais da Prime, não enfeite. */
const DESTAQUES = ["Marca", "Reels", "Campanhas", "Bastidores"];

export default function ServicoSocial({ section, servico }) {
  const fundo = videoDaFrente(servico.video);
  // O REEL mostra filmagem de verdade: é o único formato que depende disso.
  const reel = videoDaFrente("audiovisual");

  return (
    <div className="social" data-social>
      {/* Fundo: o vídeo da frente, bem escurecido. Camada mais lenta do
          parallax — é atmosfera, não conteúdo. */}
      <div className="social__fundo" data-parallax="back" aria-hidden="true">
        <video
          className="social__video"
          data-frente-video
          data-fundo
          src={fundo.src}
          poster={fundo.poster}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          tabIndex={-1}
        />
        <span className="social__scrim" />
      </div>

      <div className="social__texto" data-parallax="front">
        <Numero numero={servico.numero} nome={servico.nome} />
        <Title lines={servico.chamada} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={servico.corpo} />
        </p>
      </div>

      {/* O palco. `data-estado` é lido pela coreografia: solto → feed → entrando. */}
      <div className="social__palco" data-social-palco data-estado="solto">
        {/* O cabeçalho do perfil. Sem número de seguidor: inventar métrica
            para impressionar é exatamente o que esta página argumenta contra —
            e seria a mentira mais fácil de checar do site inteiro. */}
        <div className="social__moldura" data-social-moldura aria-hidden="true">
          <div className="social__perfil">
            <span className="social__avatar">P</span>
            <span className="social__id">
              <b>agencia.prime</b>
              <i>Agência de marketing</i>
              <u>Estratégia · conteúdo · design · vídeo · web</u>
            </span>
          </div>

          <ul className="social__destaques">
            {DESTAQUES.map((d) => (
              <li key={d}>
                <span className="social__bolha" />
                {d}
              </li>
            ))}
          </ul>
        </div>

        {PECAS.map((p, i) => (
          <figure
            className={`peca peca--${p.tipo}`}
            data-flip-id={p.id}
            data-peca-tipo={p.tipo}
            data-indice={i}
            key={p.id}
          >
            <span className="peca__mid" aria-hidden="true">
              {p.tipo === "reel" && (
                <>
                  <video
                    className="peca__video"
                    data-peca-video
                    data-fundo
                    src={reel.src}
                    poster={reel.poster}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    disablePictureInPicture
                    tabIndex={-1}
                  />
                  <span className="peca__play" />
                </>
              )}
              {p.tipo === "marca" && <img className="peca__marca" src="/logo-mark.png" alt="" />}
              {p.tipo === "assinatura" && (
                <img className="peca__wordmark" src="/logo-nav.png" alt="" />
              )}
              {p.tipo === "frase" && <span className="peca__frase">{p.texto}</span>}
              {p.tipo === "numero" && <span className="peca__numero">{p.texto}</span>}
              {p.tipo === "tipo" && <span className="peca__tipo">{p.texto}</span>}
              {p.tipo === "cor" && (
                <span className="peca__paleta">
                  <i style={{ background: "#0a0a0a" }} />
                  <i style={{ background: "#c9a84c" }} />
                  <i style={{ background: "#d9d9d9" }} />
                </span>
              )}
              {p.tipo === "grade" && (
                <span className="peca__grade">
                  {Array.from({ length: 9 }, (_, k) => (
                    <i key={k} />
                  ))}
                </span>
              )}
              {p.tipo === "story" && (
                <span className="peca__story">
                  <b />
                  <b />
                  <b />
                </span>
              )}
            </span>
            <figcaption className="peca__rotulo">{p.rotulo}</figcaption>
          </figure>
        ))}
      </div>

      {/* Conteúdo, não legenda de hover: fica no DOM sempre. */}
      <ul className="entregas" data-entregas>
        {servico.entregas.map((e) => (
          <li data-sec-item key={e}>
            <span className="entregas__marca" aria-hidden="true" />
            {e}
          </li>
        ))}
      </ul>
    </div>
  );
}
