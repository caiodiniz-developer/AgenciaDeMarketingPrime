import { Rich, Title, Numero } from "./Peca";
import { videoDaFrente } from "../lib/media";

/**
 * SOCIAL MEDIA — a frente que o empresário reconhece de imediato.
 *
 * A interação-assinatura é o FEED SE MONTANDO: as peças entram espalhadas
 * pelo palco, tortas e em tamanhos diferentes, e o GSAP Flip as reorganiza
 * numa grade de três colunas. Não é enfeite — é a demonstração literal do que
 * a Prime faz com um perfil: pega conteúdo solto e transforma em presença
 * organizada.
 *
 * As peças não são desenhos abstratos: cada uma carrega o vídeo real da
 * frente, recortado. Uma agência que produz audiovisual mostrando ícone
 * genérico é a contradição mais cara que este site poderia cometer.
 */

/** Os formatos que a Prime entrega num perfil. É a lista, dita em objeto. */
const PECAS = [
  { id: "post", rotulo: "POST", formato: "1:1" },
  { id: "reel", rotulo: "REEL", formato: "9:16" },
  { id: "story", rotulo: "STORY", formato: "9:16" },
  { id: "carrossel", rotulo: "CARROSSEL", formato: "4:5" },
  { id: "capa", rotulo: "CAPA", formato: "1:1" },
  { id: "bastidor", rotulo: "BASTIDOR", formato: "4:5" },
];

export default function ServicoSocial({ section, servico }) {
  const fundo = videoDaFrente(servico.video);
  // O REEL mostra filmagem de verdade — é o formato que mais depende disso.
  const reel = videoDaFrente("audiovisual");

  return (
    <div className="social" data-social>
      {/* Fundo: o vídeo da frente, escurecido. Camada mais lenta do parallax. */}
      <div className="social__fundo" data-parallax="back" aria-hidden="true">
        <video
          className="social__video"
          data-frente-video
          src={fundo.src}
          poster={fundo.poster}
          muted
          loop
          playsInline
          preload="none"
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

      {/* O palco. `data-estado` é lido pela coreografia: "solto" → "feed". */}
      <div className="social__palco" data-social-palco data-estado="solto">
        <div className="social__moldura" data-social-moldura aria-hidden="true">
          <span className="social__perfil">
            <img src="/logo-mark.png" alt="" />
            <span>
              <b>sua marca</b>
              <i>presença diária</i>
            </span>
          </span>
        </div>

        {PECAS.map((p, i) => (
          <figure
            className="peca"
            data-flip-id={p.id}
            data-peca-tipo={p.id}
            data-indice={i}
            key={p.id}
          >
            <span className="peca__mid" aria-hidden="true">
              {p.id === "reel" ? (
                <video
                  className="peca__video"
                  data-peca-video
                  src={reel.src}
                  poster={reel.poster}
                  muted
                  loop
                  playsInline
                  preload="none"
                  disablePictureInPicture
                  tabIndex={-1}
                />
              ) : (
                <img className="peca__img" src={fundo.poster} alt="" loading="lazy" />
              )}
              <span className="peca__veu" />
            </span>
            <figcaption className="peca__rotulo">
              <span>{p.rotulo}</span>
              <i>{p.formato}</i>
            </figcaption>
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
