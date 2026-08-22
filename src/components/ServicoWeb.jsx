import { Rich, Title, Numero } from "./Peca";
import { videoDaFrente } from "../lib/media";

/**
 * WEB — a seção que existe para o notebook.
 *
 * Aqui o modelo 3D deixa de ser cenário e vira o assunto: ele chega de lado,
 * gira até ficar frontal, a câmera se aproxima e a TELA TOMA A JANELA. Quando
 * ela enche o quadro, este painel — DOM de verdade, com texto selecionável —
 * atravessa por cima e o leitor está literalmente dentro da tela.
 *
 * O painel é DOM e não textura de propósito: a página que a Prime entrega tem
 * de ser lida como página, com tipografia nítida em qualquer densidade de
 * tela. Um vídeo de site dentro de um site é justamente o tipo de mockup que
 * o briefing manda evitar.
 *
 * O curso do scroll e o `cena.zoom` são conduzidos em Story.jsx: quem escreve
 * na cena 3D é a coreografia, não o componente.
 */
export default function ServicoWeb({ section, servico }) {
  const fundo = videoDaFrente(servico.video);

  return (
    <div className="web" data-web>
      <div className="web__fundo" aria-hidden="true">
        <video
          className="web__video"
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
        <span className="web__scrim" />
      </div>

      {/* Texto: sai de cena quando a câmera entra na tela. */}
      <div className="web__texto" data-web-texto>
        <Numero numero={servico.numero} nome={servico.nome} />
        <Title lines={servico.chamada} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={servico.corpo} />
        </p>
      </div>

      {/* Os argumentos entram um a um enquanto o objeto se aproxima. A coluna
          é estreita e fica à esquerda: o notebook ocupa o centro, e disputar
          o mesmo espaço com ele seria pôr texto por cima de imagem. */}
      <div className="web__razoes" data-web-razoes>
        {servico.razoes.map((r, i) => (
          <article className="razao-web" data-razao={r.chave} key={r.chave}>
            <span className="razao-web__marca" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="razao-web__titulo">{r.titulo}</h3>
            <p className="razao-web__texto">{r.texto}</p>
          </article>
        ))}
      </div>

      <ul className="entregas entregas--web" data-entregas>
        {servico.entregas.map((e) => (
          <li data-sec-item key={e}>
            <span className="entregas__marca" aria-hidden="true" />
            {e}
          </li>
        ))}
      </ul>

      {/* ── Dentro da tela ────────────────────────────────────────────────
          Atravessa por cima quando o painel do notebook enche a janela.
          Fica em `aria-hidden` porque é uma DEMONSTRAÇÃO da entrega, não
          conteúdo desta página: lido em voz alta, seria um segundo site
          inteiro atravessando a narrativa. */}
      <div className="dentro" data-web-dentro aria-hidden="true">
        <div className="dentro__quadro">
          <header className="dentro__barra">
            <img className="dentro__logo" src="/logo-nav.png" alt="" />
            <nav className="dentro__nav">
              <span>Início</span>
              <span>Serviços</span>
              <span>Projetos</span>
              <span>Contato</span>
            </nav>
            <span className="dentro__cta">Orçamento</span>
          </header>

          <div className="dentro__hero">
            <p className="dentro__olho">Site institucional</p>
            <h3 className="dentro__titulo">
              A PÁGINA QUE
              <br />
              ATENDE ÀS 3 DA MANHÃ
            </h3>
            <p className="dentro__linha">
              Carregando rápido, legível no celular e desenhada para uma coisa só:
              a próxima conversa.
            </p>
            <span className="dentro__botao">Pedir proposta →</span>
          </div>

          <div className="dentro__grade">
            <span className="dentro__bloco dentro__bloco--a" />
            <span className="dentro__bloco dentro__bloco--b" />
            <span className="dentro__bloco dentro__bloco--c" />
          </div>
        </div>
      </div>
    </div>
  );
}
