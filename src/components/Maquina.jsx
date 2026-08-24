import { Rich, Title, Label } from "./Peca";
import { maquina } from "../content/story";

/**
 * A MÁQUINA PRIME — "entra informação, sai presença", dito por movimento.
 *
 * A versão anterior era uma infografia: as fichas apareciam à esquerda, as
 * entregas apareciam à direita, e no meio um anel girava. Tudo por opacidade.
 * O leitor via um DIAGRAMA de um processo, não o processo.
 *
 * Agora a esteira é literal. Uma linha dourada atravessa a cena e é ela que
 * carrega tudo:
 *
 *   1 · ENTRA     as quatro informações chegam soltas e a linha as CAPTURA
 *   2 · ESCUTAR   elas viajam pela linha até o núcleo e se agrupam
 *   3 · DECIDIR   três caminhos se abrem; dois apagam, um dourado continua
 *   4 · PRODUZIR  a matéria-prima vira PEÇA — outra forma, no mesmo ponto
 *   5 · NO AR     as peças percorrem o resto da linha e viram as entregas
 *
 * As fichas e as peças andam com MotionPath sobre o mesmo `path` do SVG. É o
 * que garante que "viajar pela esteira" não seja uma metáfora escrita no
 * comentário: elas seguem a curva desenhada, ponto a ponto.
 *
 * O palco tem proporção travada. O SVG é encaixado com "meet" e os elementos
 * que andam sobre ele são DOM: se as duas geometrias divergirem, as fichas
 * saem da linha — que é o único erro que destruiria a ideia inteira.
 */

/** Coordenadas do palco. Tudo aqui fala este espaço. */
export const PALCO = { w: 1200, h: 360 };

/**
 * A esteira. Uma curva só, da entrada à saída, passando pelo núcleo no meio.
 * Suave de propósito: uma linha que serpenteia demais rouba a leitura das
 * peças que andam sobre ela.
 */
export const ESTEIRA =
  "M30 250 C 180 250, 210 120, 380 110 C 500 103, 540 180, 600 180 C 660 180, 700 103, 820 110 C 990 120, 1020 250, 1170 250";

/** Os três caminhos que se abrem em DECIDIR. O do meio é o que fica. */
export const RAMOS = [
  { id: "alto", d: "M600 180 C 700 180, 760 60, 900 52", fica: false },
  { id: "meio", d: "M600 180 C 700 180, 760 180, 900 180", fica: true },
  { id: "baixo", d: "M600 180 C 700 180, 760 300, 900 308", fica: false },
];

export default function Maquina({ section }) {
  const { entradas, etapas, saidas, fecho } = maquina;

  return (
    <div className="maquina" data-maquina>
      <header className="maquina__cabeca">
        <Label>{section.label}</Label>
        <Title lines={section.title} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={section.body} />
        </p>
      </header>

      <div className="maquina__vao">
        <div className="maquina__cena" data-maquina-cena>
          <svg
            className="maquina__trilha"
            viewBox={`0 0 ${PALCO.w} ${PALCO.h}`}
            aria-hidden="true"
          >
            {/* A calha: onde a linha VAI passar. Sem ela, o traço dourado
                aparece do nada em vez de percorrer um caminho existente. */}
            <path className="maquina__calha" d={ESTEIRA} />

            {/* Os três caminhos de DECIDIR, atrás da linha principal. */}
            <g className="maquina__ramos">
              {RAMOS.map((r) => (
                <path
                  key={r.id}
                  className="maquina__ramo"
                  data-maquina-ramo={r.id}
                  data-fica={String(r.fica)}
                  d={r.d}
                />
              ))}
            </g>

            <path className="maquina__fio" data-maquina-fio d={ESTEIRA} />
          </svg>

          {/* ── O núcleo ─────────────────────────────────────────────────
              Fica no meio da esteira. Os anéis marcam o lugar onde a
              transformação acontece; as etapas se revezam dentro dele. */}
          <div className="maquina__nucleo" data-maquina-nucleo>
            <span className="maquina__anel" aria-hidden="true" />
            <span className="maquina__anel maquina__anel--dois" aria-hidden="true" />
          </div>

          {/* ── Entra ──────────────────────────────────────────────────── */}
          <ul className="maquina__entradas" data-maquina-entradas>
            {entradas.map((e) => (
              <li className="ficha" data-maquina-ficha={e.id} key={e.id}>
                <b>{e.rotulo}</b>
                <i>{e.nota}</i>
              </li>
            ))}
          </ul>

          {/* ── Sai ────────────────────────────────────────────────────
              Vive DENTRO do palco porque é lá que as pílulas viajam sobre a
              esteira — o MotionPath precisa das duas geometrias no mesmo
              lugar. No celular o CSS a desloca para baixo do palco, onde a
              largura comporta uma fileira. */}
          <ul className="maquina__saidas" data-maquina-saidas>
            {saidas.map((s) => (
              <li className="saida" data-maquina-saida key={s}>
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* As etapas ficam FORA do palco: dentro do núcleo elas competiam com
          as peças que passam por ali, e o texto é o que explica o que se
          está vendo — precisa de um lugar estável. */}
      <ol className="maquina__etapas" data-maquina-legenda>
        {etapas.map((et, i) => (
          <li className="etapa" data-maquina-etapa={i} key={et.id}>
            <span className="etapa__num" aria-hidden="true">
              {et.numero}
            </span>
            <h3 className="etapa__titulo">{et.titulo}</h3>
            <p className="etapa__texto">{et.texto}</p>
          </li>
        ))}
      </ol>

      <p className="maquina__fecho" data-maquina-fecho>
        {fecho}
      </p>
    </div>
  );
}
