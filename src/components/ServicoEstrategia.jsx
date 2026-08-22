import { Rich, Title, Numero } from "./Peca";

/**
 * ESTRATÉGIA — a seção mais abstrata, e a única que pode ser.
 *
 * As outras quatro frentes têm entregável visível: post, página, peça, marca.
 * Estratégia não tem — o que ela produz é DECISÃO. Então a seção mostra o
 * único formato honesto disso: informação solta virando direção.
 *
 *   pontos espalhados → conexões desenhadas → tudo converge para um vetor
 *
 * Nada de dashboard: sem gráfico de barras, sem KPI, sem porcentagem
 * inventada. São palavras reais de um diagnóstico de comunicação, ligadas por
 * linhas, terminando numa direção só.
 *
 * A convergência é literal: as mesmas linhas que ligavam os pontos entre si
 * passam a apontar todas para o mesmo lugar.
 */

/**
 * Os pontos. `x`/`y` em coordenadas do viewBox (0–900 × 0–560); `alvo` é para
 * onde a linha do ponto aponta depois da convergência — sempre o vetor.
 */
const PONTOS = [
  { id: "publico", rotulo: "Para quem", x: 120, y: 110 },
  { id: "promessa", rotulo: "O que prometemos", x: 330, y: 62 },
  { id: "prova", rotulo: "Com que prova", x: 610, y: 96 },
  { id: "canal", rotulo: "Em que canal", x: 96, y: 300 },
  { id: "tom", rotulo: "Em que tom", x: 300, y: 250 },
  { id: "momento", rotulo: "Em que momento", x: 640, y: 268 },
  { id: "concorrencia", rotulo: "Contra quem", x: 170, y: 470 },
  { id: "objecao", rotulo: "Contra que dúvida", x: 430, y: 480 },
  { id: "preco", rotulo: "A que preço", x: 700, y: 440 },
];

/** Onde tudo converge. */
const FOCO = { x: 780, y: 280 };

export default function ServicoEstrategia({ section, servico }) {
  return (
    <div className="estrategia" data-estrategia>
      <div className="estrategia__texto">
        <Numero numero={servico.numero} nome={servico.nome} />
        <Title lines={servico.chamada} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={servico.corpo} />
        </p>
      </div>

      {/* A caixa existe para travar a PROPORÇÃO do viewBox.
          O SVG é encaixado com "meet" e deixa tarja dentro do palco; os
          rótulos são DOM posicionados em porcentagem da caixa. Sem as duas
          geometrias coincidindo, cada rótulo pousa longe do próprio ponto. */}
      <div className="estrategia__vao">
        <div className="estrategia__palco" data-estrategia-palco>
          <svg
            className="estrategia__svg"
            viewBox="0 0 900 560"
            role="img"
            aria-label="Perguntas de diagnóstico se conectando até convergirem em uma direção"
          >
            <defs>
              <radialGradient id="est-foco" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Malha: cada ponto ligado ao seguinte. É a fase "tudo se relaciona
              com tudo" — que é verdadeira e também é o problema. */}
            <g className="est-malha" data-est="malha">
              {PONTOS.map((p, i) => {
                const q = PONTOS[(i + 1) % PONTOS.length];
                return (
                  <line
                    key={p.id}
                    x1={p.x}
                    y1={p.y}
                    x2={q.x}
                    y2={q.y}
                    data-est-malha
                  />
                );
              })}
            </g>

            {/* Convergência: as mesmas origens, agora todas apontando ao foco. */}
            <g className="est-feixe" data-est="feixe">
              {PONTOS.map((p) => (
                <line
                  key={p.id}
                  x1={p.x}
                  y1={p.y}
                  x2={FOCO.x}
                  y2={FOCO.y}
                  data-est-feixe
                />
              ))}
            </g>

            {/* O foco. Entra por último e é a única coisa dourada cheia da cena. */}
            <g className="est-foco" data-est="foco">
              <circle
                cx={FOCO.x}
                cy={FOCO.y}
                r="96"
                fill="url(#est-foco)"
                data-est-halo
              />
              <circle cx={FOCO.x} cy={FOCO.y} r="9" data-est-nucleo />
              <path
                d={`M${FOCO.x - 34} ${FOCO.y} L${FOCO.x + 46} ${FOCO.y} M${FOCO.x + 30} ${FOCO.y - 14} L${FOCO.x + 46} ${FOCO.y} L${FOCO.x + 30} ${FOCO.y + 14}`}
                data-est-seta
              />
            </g>

            {/* Os pontos por cima das linhas. */}
            <g className="est-pontos">
              {PONTOS.map((p) => (
                <circle
                  key={p.id}
                  cx={p.x}
                  cy={p.y}
                  r="5"
                  data-est-ponto
                  data-id={p.id}
                />
              ))}
            </g>
          </svg>

          {/* Os rótulos são DOM, posicionados em porcentagem sobre o SVG: texto
            dentro de <svg> não quebra linha, não herda a tipografia da página
            e é um pesadelo para leitor de tela. */}
          <ul className="estrategia__rotulos" aria-hidden="true">
            {PONTOS.map((p) => (
              <li
                className="est-rotulo"
                data-est-rotulo={p.id}
                key={p.id}
                style={{
                  left: `${(p.x / 900) * 100}%`,
                  top: `${(p.y / 560) * 100}%`,
                }}
              >
                {p.rotulo}
              </li>
            ))}
            <li
              className="est-rotulo est-rotulo--foco"
              data-est-rotulo="foco"
              style={{
                left: `${(FOCO.x / 900) * 100}%`,
                top: `${(FOCO.y / 560) * 100}%`,
              }}
            >
              Uma direção
            </li>
          </ul>
        </div>
      </div>

      <ul className="entregas entregas--linha" data-entregas>
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
