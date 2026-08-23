import { useEffect, useRef, useState } from "react";
import { Rich, Title, Label } from "./Peca";
import { clientes } from "../content/story";
import { isTouch } from "../lib/pointer";

/**
 * QUEM CONFIA — duas marcas num arco, e a PRIME como o ponto que as liga.
 *
 * A versão anterior abria um MODAL no centro da tela. Funcionava, mas a
 * sensação era "cliquei, abriu uma janela": a página parava e outra coisa
 * aparecia por cima. Aqui a sensação tem de ser outra — "apontei, e a seção
 * se transformou".
 *
 * Então o perfil abre DENTRO da composição. O arco continua desenhado, a
 * outra marca recua, e o painel do Instagram nasce ao lado da marca apontada,
 * revelado por clip-path: parte do mesmo quadro, não uma camada sobre ele.
 *
 * O IFRAME É REAL: aponta para `instagram.com/<perfil>/embed`. Quando o
 * Instagram responde, vê-se o perfil de verdade sem sair do site. Quando ele
 * recusa — e recusa às vezes, com `X-Frame-Options` —, o painel assume o
 * conteúdo da Prime com o caminho para o perfil verdadeiro. Não existe como
 * perguntar "carregou?" a um iframe de outra origem, então o painel trabalha
 * com prazo.
 */
export default function Clientes({ section }) {
  const [ativo, setAtivo] = useState(null);
  const [pronto, setPronto] = useState(false);
  const [desistiu, setDesistiu] = useState(false);
  const palco = useRef(null);

  /* Prazo do iframe, reiniciado a cada marca. */
  useEffect(() => {
    setPronto(false);
    setDesistiu(false);
    if (!ativo) return undefined;
    const t = setTimeout(() => setDesistiu(true), 4500);
    return () => clearTimeout(t);
  }, [ativo]);

  /* No toque não existe apontar: a marca em leitura é a ativa. */
  useEffect(() => {
    if (!isTouch()) return undefined;
    const alvos = [...(palco.current?.querySelectorAll("[data-marca]") || [])];
    if (!alvos.length) return undefined;

    const obs = new IntersectionObserver(
      (entradas) => {
        const visivel = entradas.find((e) => e.isIntersecting);
        if (!visivel) return;
        const id = visivel.target.dataset.marca;
        setAtivo(clientes.find((c) => c.id === id) || null);
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );
    alvos.forEach((a) => obs.observe(a));
    return () => obs.disconnect();
  }, []);

  const mostrarReserva = Boolean(ativo) && desistiu && !pronto;

  return (
    <div
      className="quem"
      data-quem
      data-ativo={ativo?.id || ""}
      onPointerLeave={(e) => e.pointerType === "mouse" && setAtivo(null)}
    >
      <header className="quem__cabeca">
        <Label>{section.label}</Label>
        <Title lines={section.title} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={section.body} />
        </p>
      </header>

      <div className="quem__palco" ref={palco} data-quem-palco>
        {/* O ARCO. Liga a marca de baixo à de cima passando pelo centro, onde
            fica a Prime. É o mesmo traço dourado que atravessa a Estratégia e
            a Máquina — aqui ele vira o laço entre duas marcas. */}
        <svg className="quem__arco" viewBox="0 0 1000 560" aria-hidden="true">
          <defs>
            <linearGradient id="quem-grad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.5" />
              <stop offset="50%" stopColor="#c9a84c" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.6" />
            </linearGradient>
          </defs>
          <path
            className="quem__arco-calha"
            d="M150 470 C 150 200, 360 120, 500 280 C 640 440, 850 360, 850 110"
          />
          <path
            className="quem__arco-traco"
            data-quem-arco
            d="M150 470 C 150 200, 360 120, 500 280 C 640 440, 850 360, 850 110"
            stroke="url(#quem-grad)"
          />
          <circle className="quem__no" cx="500" cy="280" r="5" data-quem-no />
        </svg>

        {/* A Prime no ponto de encontro do arco. Discreta de propósito: quem
            precisa ter presença aqui são os clientes. */}
        <span className="quem__centro" data-quem-centro aria-hidden="true">
          PRIME
        </span>

        {clientes.map((c, i) => (
          <article
            className="marca"
            data-marca={c.id}
            data-indice={i}
            data-active={String(ativo?.id === c.id)}
            key={c.id}
          >
            <button
              className="marca__gatilho"
              type="button"
              onClick={() => setAtivo(ativo?.id === c.id ? null : c)}
              onPointerEnter={(e) => e.pointerType === "mouse" && setAtivo(c)}
              onFocus={() => setAtivo(c)}
              data-cursor="view"
              data-cursor-text="Ver"
              aria-label={`Ver o perfil de ${c.nome} no Instagram`}
              aria-expanded={ativo?.id === c.id}
            >
              <span className="marca__placa" data-placa={String(c.placa)}>
                <img src={c.logo} alt={c.nome} loading="lazy" />
              </span>
              <span className="marca__pe">
                <span className="marca__nome">{c.nome}</span>
                <span className="marca__arroba">{c.arroba}</span>
              </span>
              <span className="marca__risco" aria-hidden="true" />
            </button>
          </article>
        ))}

        {/* ── O painel do perfil ────────────────────────────────────────
            Nasce por clip-path dentro do próprio palco, ao lado da marca
            apontada. Não é modal: a composição continua inteira em volta. */}
        <div className="quem__perfil" data-quem-perfil data-aberto={String(Boolean(ativo))}>
          {ativo && (
            <>
              <header className="quem__perfil-topo">
                <span className="quem__perfil-marca" data-placa={String(ativo.placa)}>
                  <img src={ativo.logo} alt="" aria-hidden="true" />
                </span>
                <span className="quem__perfil-id">
                  <b>{ativo.nome}</b>
                  <i>{ativo.arroba}</i>
                </span>
              </header>

              <div className="quem__perfil-janela">
                {!mostrarReserva && (
                  <iframe
                    key={ativo.id}
                    className="quem__perfil-frame"
                    title={`Instagram de ${ativo.nome}`}
                    src={`https://www.instagram.com/${ativo.arroba.replace("@", "")}/embed/`}
                    loading="lazy"
                    onLoad={() => setPronto(true)}
                    /* `allow-same-origin` fica de fora de propósito: junto de
                       `allow-scripts`, os dois anulam a caixa de areia. */
                    sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                )}

                {!pronto && (
                  <p className="quem__perfil-reserva">
                    {desistiu
                      ? "O Instagram não permite exibir este perfil dentro de outro site."
                      : "Carregando o perfil…"}
                  </p>
                )}
              </div>

              <a
                className="quem__perfil-link"
                href={ativo.instagram}
                target="_blank"
                rel="noreferrer noopener"
                data-cursor="button"
              >
                Abrir {ativo.arroba}
                <span aria-hidden="true">↗</span>
              </a>
            </>
          )}
        </div>
      </div>

      <p className="quem__dica" data-quem-dica>
        <span className="quem__dica-toque">Role para conhecer cada uma</span>
        <span className="quem__dica-mouse">Aponte para uma marca</span>
      </p>
    </div>
  );
}
