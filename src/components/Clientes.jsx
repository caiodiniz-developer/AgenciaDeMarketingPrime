import { clientes } from "../content/story";

/**
 * Prova social — os clientes.
 *
 * A composição é uma DISPUTA, não um carrossel: os painéis dividem a tela e
 * o que é apontado toma espaço do outro. Com dois clientes, logo passar de
 * um slider seria esconder metade da prova atrás de um botão.
 *
 * Tudo é desenhado a partir do que existe de verdade em `clientes`. Campo
 * ausente não vira placeholder visível: o bloco simplesmente não é desenhado.
 * Nome de cliente, frente atendida e depoimento inventados seriam prova
 * fabricada — o oposto do que esta página vende.
 */
export default function Clientes({ section }) {
  const lista = clientes.filter((c) => c.logo);
  if (!lista.length) return null;

  return (
    <div className="duelo" data-duelo data-quantos={lista.length}>
      {lista.map((cliente, i) => (
        <article
          className="painel"
          data-painel={cliente.id}
          data-indice={i}
          data-sec-item
          key={cliente.id}
        >
          {cliente.video && (
            <video
              className="painel__video"
              data-painel-video
              src={cliente.video}
              poster={cliente.poster || undefined}
              muted
              loop
              playsInline
              preload="none"
              disablePictureInPicture
              tabIndex={-1}
              aria-hidden="true"
            />
          )}

          <span className="painel__veu" aria-hidden="true" />

          <div className="painel__conteudo">
            {/* Placa clara SÓ quando a marca é escura. Recolorir marca de
                terceiro é mexer no que não é nosso; a placa resolve o
                contraste sem tocar no arquivo. Numa marca já clara, ela
                faria o contrário — apagaria o nome. */}
            <span className="painel__placa" data-placa={cliente.placa !== false}>
              <img
                className="painel__logo"
                src={cliente.logo}
                alt={cliente.nome ? `Logo ${cliente.nome}` : "Logo do cliente"}
                loading="lazy"
              />
            </span>

            {cliente.nome && <h3 className="painel__nome">{cliente.nome}</h3>}

            {cliente.frentes?.length > 0 && (
              <ul className="painel__frentes" data-painel-info>
                {cliente.frentes.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}

            {cliente.depoimento && (
              <blockquote className="painel__fala" data-painel-info>
                <p>{cliente.depoimento.texto}</p>
                {cliente.depoimento.autor && <cite>{cliente.depoimento.autor}</cite>}
              </blockquote>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
