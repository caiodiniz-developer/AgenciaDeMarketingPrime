import { Rich, Title, Numero } from "./Peca";
import { videoDaFrente } from "../lib/media";

/**
 * DESIGN — a composição editorial.
 *
 * A seção herda a seção anterior de propósito: as peças NASCEM arrumadas em
 * fileiras, com a cara de uma interface — barra, cards, coluna de texto — que
 * é exatamente o que a tela do notebook mostrava um instante antes. Conforme
 * se rola, o GSAP Flip desmonta essa interface e recompõe as mesmas peças como
 * pôsteres numa grade editorial assimétrica.
 *
 * A leitura é "a interface virou peça gráfica", não "acabou uma seção e
 * começou outra" — que é o corte que o briefing proíbe.
 *
 * `tipo` decide o que cada peça carrega: imagem, tipografia ou cor chapada.
 * Uma grade só de fotos vira moodboard; o que vende design é a mistura.
 */
const PECAS = [
  { id: "cartaz", tipo: "midia", rotulo: "Campanha", area: "a" },
  { id: "tipo", tipo: "tipo", rotulo: "Tipografia", area: "b", amostra: "Aa" },
  { id: "carrossel", tipo: "midia", rotulo: "Carrossel", area: "c" },
  { id: "cor", tipo: "cor", rotulo: "Paleta", area: "d" },
  { id: "flyer", tipo: "midia", rotulo: "Material impresso", area: "e" },
  { id: "grid", tipo: "grade", rotulo: "Diagramação", area: "f" },
];

export default function ServicoDesign({ section, servico }) {
  const midia = videoDaFrente(servico.video);

  return (
    <div className="design" data-design>
      <div className="design__texto">
        <Numero numero={servico.numero} nome={servico.nome} />
        <Title lines={servico.chamada} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={servico.corpo} />
        </p>
        <ul className="entregas entregas--linha" data-entregas>
          {servico.entregas.map((e) => (
            <li data-sec-item key={e}>
              <span className="entregas__marca" aria-hidden="true" />
              {e}
            </li>
          ))}
        </ul>
      </div>

      {/* `data-estado` é lido pela coreografia: "interface" → "editorial". */}
      <div className="design__palco" data-design-palco data-estado="interface">
        {/* Vídeo único por trás das peças de mídia: seis <video> na mesma tela
            seriam seis decodificadores rodando para mostrar o mesmo material. */}
        <video
          className="design__video"
          data-frente-video
          data-fundo
          src={midia.src}
          poster={midia.poster}
          muted
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          tabIndex={-1}
          aria-hidden="true"
        />

        {PECAS.map((p, i) => (
          <figure
            className={`cartaz cartaz--${p.tipo}`}
            data-flip-id={p.id}
            data-area={p.area}
            data-indice={i}
            data-tilt
            key={p.id}
          >
            <span className="cartaz__mid" aria-hidden="true">
              {p.tipo === "midia" && <img src={midia.poster} alt="" loading="lazy" />}
              {p.tipo === "tipo" && <span className="cartaz__amostra">{p.amostra}</span>}
              {p.tipo === "cor" && (
                <span className="cartaz__paleta">
                  <i style={{ background: "#0a0a0a" }} />
                  <i style={{ background: "#c9a84c" }} />
                  <i style={{ background: "#d9d9d9" }} />
                  <i style={{ background: "#ffffff" }} />
                </span>
              )}
              {p.tipo === "grade" && (
                <span className="cartaz__grade">
                  {Array.from({ length: 12 }, (_, k) => (
                    <i key={k} />
                  ))}
                </span>
              )}
            </span>
            <figcaption className="cartaz__rotulo">{p.rotulo}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
