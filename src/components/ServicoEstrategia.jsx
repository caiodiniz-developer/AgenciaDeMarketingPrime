import { Rich, Title, Numero } from "./Peca";

/**
 * ESTRATÉGIA — do emaranhado à direção.
 *
 * As outras quatro frentes têm entregável visível: post, página, peça, marca.
 * Estratégia não tem — o que ela produz é DECISÃO. Então a seção mostra o
 * único formato honesto disso: as perguntas que vêm antes de produzir, e o
 * momento em que elas param de brigar entre si.
 *
 *   1 · as nove perguntas, numa retícula limpa
 *   2 · a malha: cada uma ligada às vizinhas — tudo se relaciona com tudo,
 *       que é verdade e é justamente o problema
 *   3 · a convergência: as mesmas origens apontando todas para o mesmo lugar
 *
 * A VERSÃO ANTERIOR ERRAVA AQUI. Os pontos ficavam espalhados a esmo e a malha
 * ligava cada um ao SEGUINTE DA LISTA — uma ordem que só existia no código. O
 * desenho saía com linhas cruzando o quadro sem motivo, e "sem motivo" é
 * exatamente o oposto do que a seção precisa comunicar. Agora a retícula é
 * regular e a malha liga VIZINHOS de verdade: o emaranhado tem lógica, e é por
 * isso que desfazê-lo significa alguma coisa.
 *
 * Nada de dashboard: sem gráfico de barras, sem KPI, sem porcentagem
 * inventada. São perguntas reais de um diagnóstico de comunicação.
 */

const COLUNAS = [110, 300, 490];
const LINHAS = [130, 290, 450];

/** As nove perguntas, em retícula. `c` e `l` são coluna e linha. */
const PERGUNTAS = [
  { id: "publico", rotulo: "Para quem", c: 0, l: 0 },
  { id: "promessa", rotulo: "O que prometer", c: 1, l: 0 },
  { id: "prova", rotulo: "Com que prova", c: 2, l: 0 },
  { id: "canal", rotulo: "Em que canal", c: 0, l: 1 },
  { id: "tom", rotulo: "Em que tom", c: 1, l: 1 },
  { id: "momento", rotulo: "Em que momento", c: 2, l: 1 },
  { id: "concorrencia", rotulo: "Contra quem", c: 0, l: 2 },
  { id: "objecao", rotulo: "Contra que dúvida", c: 1, l: 2 },
  { id: "preco", rotulo: "A que preço", c: 2, l: 2 },
];

const PONTOS = PERGUNTAS.map((p) => ({ ...p, x: COLUNAS[p.c], y: LINHAS[p.l] }));

/** Onde tudo converge: fora da retícula, à direita, no meio da altura. */
const FOCO = { x: 790, y: 290 };

/** Ligações entre VIZINHOS na retícula — horizontais e verticais. */
const MALHA = [];
for (const a of PONTOS) {
  for (const b of PONTOS) {
    const vizinho =
      (a.l === b.l && b.c === a.c + 1) || (a.c === b.c && b.l === a.l + 1);
    if (vizinho) MALHA.push({ id: `${a.id}-${b.id}`, a, b });
  }
}

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

      {/* O vão é a área que sobra na tela; o palco é a caixa de proporção
          travada lá dentro. As duas geometrias precisam coincidir, porque os
          rótulos são DOM posicionados em porcentagem sobre um SVG encaixado
          com "meet" — e "meet" deixa tarja. */}
      <div className="estrategia__vao">
        <div className="estrategia__palco" data-estrategia-palco>
          <svg
            className="estrategia__svg"
            viewBox="0 0 900 580"
            role="img"
            aria-label="Nove perguntas de diagnóstico se conectando até convergirem em uma direção"
          >
            <defs>
              <radialGradient id="est-foco" cx="50%" cy="50%">
                <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g className="est-malha" data-est="malha">
              {MALHA.map((m) => (
                <line key={m.id} x1={m.a.x} y1={m.a.y} x2={m.b.x} y2={m.b.y} data-est-malha />
              ))}
            </g>

            <g className="est-feixe" data-est="feixe">
              {PONTOS.map((p) => (
                <line key={p.id} x1={p.x} y1={p.y} x2={FOCO.x} y2={FOCO.y} data-est-feixe />
              ))}
            </g>

            {/* O foco. Entra por último e é a única coisa dourada cheia. */}
            <g className="est-foco" data-est="foco">
              <circle cx={FOCO.x} cy={FOCO.y} r="110" fill="url(#est-foco)" data-est-halo />
              <circle cx={FOCO.x} cy={FOCO.y} r="8" data-est-nucleo />
              <path
                d={`M${FOCO.x + 26} ${FOCO.y} L${FOCO.x + 74} ${FOCO.y} M${FOCO.x + 58} ${FOCO.y - 13} L${FOCO.x + 74} ${FOCO.y} L${FOCO.x + 58} ${FOCO.y + 13}`}
                data-est-seta
              />
            </g>

            <g className="est-pontos">
              {PONTOS.map((p) => (
                <circle key={p.id} cx={p.x} cy={p.y} r="4.5" data-est-ponto data-id={p.id} />
              ))}
            </g>
          </svg>

          {/* Os rótulos são DOM: texto dentro de <svg> não quebra linha, não
              herda a tipografia da página e é um pesadelo para leitor de tela. */}
          <ul className="estrategia__rotulos" aria-hidden="true">
            {PONTOS.map((p) => (
              <li
                className="est-rotulo"
                data-est-rotulo={p.id}
                key={p.id}
                style={{ left: `${(p.x / 900) * 100}%`, top: `${(p.y / 580) * 100}%` }}
              >
                {p.rotulo}
              </li>
            ))}
            <li
              className="est-rotulo est-rotulo--foco"
              data-est-rotulo="foco"
              style={{ left: `${(FOCO.x / 900) * 100}%`, top: `${(FOCO.y / 580) * 100}%` }}
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
