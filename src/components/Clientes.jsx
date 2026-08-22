import { Rich, Title, Label } from "./Peca";
import { clientes } from "../content/story";

/**
 * QUEM CONFIA — dois clientes, e uma composição feita PARA dois.
 *
 * Carrossel com duas logos é confissão de que não há mais; marquee com as
 * mesmas duas repetindo é pior ainda. Então a seção assume o número: um arco
 * dourado desenhado pelo scroll liga as duas marcas de ponta a ponta, uma
 * embaixo à esquerda e outra em cima à direita. Duas é o que existe, e a
 * composição faz de duas uma decisão de design.
 *
 * PREVIEW DO INSTAGRAM
 * Não há embed: o iframe do Instagram é bloqueável e derrubaria a seção
 * inteira. E não há print fabricado: eu não tenho as publicações reais destes
 * perfis, e inventar peça de cliente seria exatamente a prova falsa que este
 * site inteiro argumenta contra.
 *
 * O que existe é honesto: a marca real, o @ real, o link real, e uma
 * composição da identidade do cliente na linguagem da Prime. Quem quiser ver o
 * conteúdo vai ao perfil — e é para lá que o botão manda.
 */
export default function Clientes({ section }) {
  const um = clientes.length === 1;

  return (
    <div className="quem" data-quem data-total={clientes.length}>
      <header className="quem__cabeca">
        <Label>{section.label}</Label>
        <Title lines={section.title} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={section.body} />
        </p>
      </header>

      <div className="quem__palco" data-quem-palco>
        {/* O arco. Desenhado com stroke-dashoffset conforme a seção entra —
            a composição se forma na frente do leitor em vez de já estar lá. */}
        <svg className="quem__arco" viewBox="0 0 1000 620" aria-hidden="true">
          <defs>
            <linearGradient id="quem-grad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#c9a84c" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.65" />
            </linearGradient>
          </defs>
          <path
            className="quem__arco-calha"
            d="M120 520 C 300 520, 300 120, 520 120 C 720 120, 760 200, 880 150"
          />
          <path
            className="quem__arco-traco"
            data-quem-arco
            d="M120 520 C 300 520, 300 120, 520 120 C 720 120, 760 200, 880 150"
            stroke="url(#quem-grad)"
          />
        </svg>

        {clientes.map((c, i) => (
          <article
            className="marca"
            data-marca={c.id}
            data-indice={i}
            data-active="false"
            key={c.id}
          >
            {/* A logo é o gatilho e o herói. Nada de card com borda em volta:
                a marca do cliente não precisa de moldura da Prime. */}
            <div className="marca__selo" data-marca-selo data-placa={String(c.placa)}>
              <img src={c.logo} alt={c.nome} loading="lazy" />
            </div>

            <div className="marca__ficha" data-marca-ficha>
              <h3 className="marca__nome" data-flip-id={`nome-${c.id}`}>
                {c.nome}
              </h3>

              {/* ── Preview: identidade real, na linguagem da Prime ─────── */}
              <div className="perfil" data-marca-perfil>
                <div className="perfil__topo">
                  <span className="perfil__avatar" data-placa={String(c.placa)}>
                    <img src={c.logo} alt="" aria-hidden="true" />
                  </span>
                  <span className="perfil__id">
                    <b>{c.arroba}</b>
                    <i>Instagram</i>
                  </span>
                </div>

                <div className="perfil__grade" aria-hidden="true">
                  {Array.from({ length: 4 }, (_, k) => (
                    <span className="perfil__celula" data-perfil-celula key={k}>
                      <img src={c.logo} alt="" />
                    </span>
                  ))}
                </div>

                {/* Dito com todas as letras: o conteúdo mora lá, não aqui.
                    Uma grade de marcas d'água apresentada como "posts" seria
                    a mesma mentira que um print inventado. */}
                <p className="perfil__nota">O conteúdo publicado está no perfil.</p>

                <a
                  className="perfil__link"
                  href={c.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                  data-cursor="button"
                >
                  Ver {c.arroba}
                  <span aria-hidden="true">↗</span>
                </a>
              </div>

              {/* Só desenha o que existe: sem frentes cadastradas, nada aqui.
                  Preencher com "social media, design, branding" para todo
                  cliente é inventar escopo de contrato alheio. */}
              {c.frentes.length > 0 && (
                <ul className="marca__frentes">
                  {c.frentes.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              )}

              {c.depoimento && (
                <blockquote className="marca__depoimento">
                  <p>{c.depoimento.texto}</p>
                  <cite>{c.depoimento.autor}</cite>
                </blockquote>
              )}
            </div>
          </article>
        ))}
      </div>

      {!um && (
        <p className="quem__dica" data-quem-dica>
          <span className="quem__dica-toque">Role para conhecer cada uma</span>
          <span className="quem__dica-mouse">Aponte para uma marca</span>
        </p>
      )}
    </div>
  );
}
