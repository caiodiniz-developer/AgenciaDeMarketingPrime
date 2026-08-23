import { Rich, Title, Label } from "./Peca";
import { forcas } from "../content/story";

/** Quantas peças o palco tem. Doze é o mínimo para uma grade ler como grade. */
const TOTAL_PECAS = 12;

/**
 * POR QUE FUNCIONA — cinco forças em volta de uma marca.
 *
 * Em vez de quatro cards de benefício dizendo "somos consistentes", a seção
 * DEMONSTRA: escolher uma força reorganiza fisicamente as doze peças do palco
 * para mostrar o que aquele conceito faz com a comunicação de uma empresa.
 *
 *   consistência → o desalinho se resolve e tudo passa a falar a mesma língua
 *   estratégia   → as peças se inclinam todas para o mesmo alvo
 *   qualidade    → a composição grosseira ganha hierarquia e acabamento
 *   frequência   → o calendário se preenche em cadência, uma peça por vez
 *   direção      → tudo se alinha a um eixo, com alguém à frente
 *
 * Nenhuma delas é blur→nítido: o briefing pede mudança real de layout, e
 * mudança real de layout é o que o GSAP faz aqui, peça por peça.
 *
 * No desktop quem escolhe é o ponteiro (ou o teclado). No toque não existe
 * hover, então cada força assume o palco conforme entra na viewport.
 */
export default function SistemaPrime({ section }) {
  return (
    <div className="sistema" data-sistema>
      <header className="sistema__cabeca">
        <Label>{section.label}</Label>
        <Title lines={section.title} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={section.body} />
        </p>
      </header>

      <div className="sistema__corpo">
        {/* ── O palco ────────────────────────────────────────────────── */}
        <div className="palco" data-palco data-demo="repouso">
          <div className="palco__marca" data-palco-marca>
            <img src="/logo-mark.png" alt="" aria-hidden="true" />
            <span>MARCA</span>
          </div>

          {/* As peças. Nascem desalinhadas — que é o estado real de quem
              nunca teve direção — e cada força as reorganiza. */}
          {Array.from({ length: TOTAL_PECAS }, (_, i) => (
            <span className="palco__peca" data-palco-peca={i} key={i}>
              <i className="palco__linha" />
              <i className="palco__linha palco__linha--curta" />
            </span>
          ))}

          {/* A legenda nomeia o que está sendo demonstrado. Sem ela, o
              leitor vê doze peças se mexendo e tem de adivinhar por quê. */}
          <span className="palco__legenda" data-palco-legenda aria-hidden="true" />

          {/* Eixo que só aparece na demonstração de DIREÇÃO. */}
          <svg className="palco__eixo" viewBox="0 0 400 400" aria-hidden="true">
            <line x1="30" y1="200" x2="370" y2="200" data-palco-eixo />
            <path d="M352 188 L370 200 L352 212" data-palco-seta />
          </svg>
        </div>

        {/* ── As cinco forças ────────────────────────────────────────── */}
        <ul className="forcas" data-forcas>
          {forcas.map((f, i) => (
            <li className="forca" data-forca={f.demo} data-indice={i} key={f.id}>
              <button className="forca__botao" type="button" data-cursor="view" data-cursor-text="Ver">
                <span className="forca__rotulo">{f.rotulo}</span>
                <span className="forca__risco" aria-hidden="true" />
              </button>
              <div className="forca__texto">
                <h3>{f.titulo}</h3>
                <p>{f.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
