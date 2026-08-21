import { servicos } from "../content/story";

/**
 * O computador da seção "Digital".
 *
 * Construído em CSS 3D, e não no modelo .glb, por uma razão concreta: a tela
 * precisa ser DOM de verdade. É isso que permite o conteúdo rolar dentro dela,
 * o texto continuar selecionável e legível para leitores de tela, e a própria
 * tela crescer até tomar a viewport no fim da sequência. Num modelo 3D, tudo
 * isso viraria textura — e textura não rola, não escala com nitidez e não é
 * lida por ninguém.
 *
 * O que aparece na tela é o próprio site da Prime. É a prova mais honesta que
 * existe aqui: nenhum trabalho de cliente foi inventado, e a página que o
 * leitor está usando é o exemplo.
 *
 * Camadas, e cada uma responde ao scroll numa velocidade diferente:
 *   sombra → base → tela → conteúdo → reflexo → brilho
 */
export default function Computer({ section }) {
  return (
    <div className="digital" data-digital>
      <div className="digital__texto" data-digital-texto>
        <p className="sec__label" data-sec-label>
          <span className="sec__label-dot" aria-hidden="true" />
          {section.label}
        </p>
        <h2 className="sec__title" data-sec-title aria-label={section.title.join(" ")}>
          {section.title.map((linha, i) => (
            <span key={i}>
              {i > 0 && <br />}
              {linha}
            </span>
          ))}
        </h2>
        <p className="sec__body" data-sec-body>
          O site que você está usando é nosso. Cada rolagem daqui em diante é
          uma demonstração — <em>não uma promessa</em>.
        </p>
      </div>

      <div className="digital__palco" data-digital-palco>
        <div className="mac" data-mac>
          <span className="mac__sombra" data-mac-sombra aria-hidden="true" />

          {/* Duas camadas de transform: o SCROLL gira a caixa de fora e o
              MOUSE gira o corpo. `transform` é uma propriedade só — no mesmo
              nó, o último a escrever apagaria o outro. */}
          <div className="mac__corpo" data-mac-corpo>
          <div className="mac__tela" data-mac-tela>
            <div className="mac__viewport" data-mac-viewport>
              <div className="mac__conteudo" data-mac-conteudo>
                <MiniSite />
              </div>
            </div>

            {/* Reflexo: só deve ser percebido sem que ninguém repare nele. */}
            <span className="mac__reflexo" data-mac-reflexo aria-hidden="true" />
            <span className="mac__camera" aria-hidden="true" />
          </div>

          <div className="mac__base" aria-hidden="true">
            <span className="mac__teclado" />
            <span className="mac__trackpad" />
            <span className="mac__entalhe" />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * O conteúdo da tela: uma redução do próprio site, montada com os mesmos
 * elementos da identidade. Rola por dentro enquanto o computador fica parado.
 */
function MiniSite() {
  return (
    <div className="mini" aria-hidden="true">
      <header className="mini__barra">
        <img className="mini__logo" src="/logo-nav.png" alt="" />
        <span className="mini__links">
          <i />
          <i />
          <i />
        </span>
        <span className="mini__cta" />
      </header>

      <section className="mini__hero">
        <span className="mini__kicker">AGÊNCIA</span>
        <span className="mini__marca">PRIME</span>
        <span className="mini__linha" />
      </section>

      <section className="mini__bloco">
        <span className="mini__titulo" />
        <span className="mini__titulo mini__titulo--curto" />
        <div className="mini__grade">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </section>

      <section className="mini__lista">
        {servicos.map((s) => (
          <span className="mini__item" key={s.id}>
            <b>{s.numero}</b>
            <em>{s.nome}</em>
          </span>
        ))}
      </section>

      <section className="mini__filme">
        <span className="mini__play" />
      </section>

      <section className="mini__fecho">
        <span className="mini__titulo" />
        <span className="mini__botao" />
      </section>
    </div>
  );
}
