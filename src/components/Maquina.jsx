import { Rich, Title, Label } from "./Peca";
import { maquina } from "../content/story";

/**
 * A MÁQUINA PRIME — o método sem os quatro cards numerados.
 *
 * A cena é presa e o scroll conduz uma linha de produção da esquerda para a
 * direita:
 *
 *   ENTRA o que a empresa já sabe de cor  →  quatro operações  →  SAI
 *   comunicação pronta
 *
 * As fichas de entrada não desaparecem para as de saída aparecerem: elas
 * VIAJAM para dentro do núcleo (GSAP Flip), somem lá dentro e o que sai do
 * outro lado nasce da mesma linha dourada que as engoliu. O leitor vê a
 * transformação acontecer — que é a diferença entre "temos um processo" e
 * mostrar o processo.
 *
 * A linha dourada é um `path` único desenhado com `stroke-dashoffset`: um
 * traço contínuo do primeiro insumo à última entrega amarra a leitura melhor
 * do que qualquer seta entre caixas.
 */
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

      <div className="maquina__cena" data-maquina-cena>
        {/* A esteira. Fica atrás de tudo e é o único elemento que atravessa a
            cena inteira — é ela que diz "isto é uma linha, não três blocos". */}
        <svg
          className="maquina__trilha"
          viewBox="0 0 1200 320"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            className="maquina__calha"
            d="M40 160 C 260 160, 300 60, 480 60 C 620 60, 620 260, 760 260 C 900 260, 940 160, 1160 160"
          />
          <path
            className="maquina__fio"
            data-maquina-fio
            d="M40 160 C 260 160, 300 60, 480 60 C 620 60, 620 260, 760 260 C 900 260, 940 160, 1160 160"
          />
        </svg>

        {/* ── Entra ─────────────────────────────────────────────────── */}
        <ul className="maquina__entradas" data-maquina-entradas>
          {entradas.map((e) => (
            <li className="ficha" data-flip-id={e.id} data-maquina-ficha key={e.id}>
              <b>{e.rotulo}</b>
              <i>{e.nota}</i>
            </li>
          ))}
        </ul>

        {/* ── Acontece ──────────────────────────────────────────────── */}
        <div className="maquina__nucleo" data-maquina-nucleo>
          <span className="maquina__anel" aria-hidden="true" />
          <span className="maquina__anel maquina__anel--dois" aria-hidden="true" />
          <ol className="maquina__etapas">
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
        </div>

        {/* ── Sai ───────────────────────────────────────────────────── */}
        <ul className="maquina__saidas" data-maquina-saidas>
          {saidas.map((s) => (
            <li className="saida" data-maquina-saida key={s}>
              {s}
            </li>
          ))}
        </ul>
      </div>

      <p className="maquina__fecho" data-maquina-fecho>
        {fecho}
      </p>
    </div>
  );
}
