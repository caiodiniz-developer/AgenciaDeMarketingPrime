import { estadosDoSistema } from "../content/story";

/**
 * A cena do sistema — a seção "Como funciona".
 *
 * Substitui a lista de etapas em cards por UMA composição que se reorganiza
 * conduzida pelo scroll. O leitor não lê o processo: ele vê a comunicação
 * saindo do caos e virando sistema, com a empresa dele no centro.
 *
 * As peças são nomeadas com o que realmente sai de uma agência (POST, REEL,
 * LOGO, SITE…). Ícone genérico de lâmpada ou foguete diria "processo" sem
 * dizer nada; o nome da peça diz exatamente o que a Prime entrega.
 *
 * Toda a geometria é calculada aqui, não escrita à mão: quatro estados vezes
 * doze peças seriam 48 pares de coordenadas para manter sincronizados.
 */

/* `area` usa `data-area` no DOM, e não `data-frente`: este último é das
   frentes de serviço, e o mesmo atributo nos dois lugares faz qualquer
   consulta global devolver as 18 de uma vez. */
export const PECAS = [
  { id: "post", rotulo: "POST", frente: "design" },
  { id: "reel", rotulo: "REEL", frente: "audiovisual" },
  { id: "logo", rotulo: "LOGO", frente: "branding" },
  { id: "site", rotulo: "SITE", frente: "web" },
  { id: "story", rotulo: "STORY", frente: "social" },
  { id: "anuncio", rotulo: "ANÚNCIO", frente: "estrategia" },
  { id: "carrossel", rotulo: "CARROSSEL", frente: "design" },
  { id: "institucional", rotulo: "INSTITUCIONAL", frente: "audiovisual" },
  { id: "paleta", rotulo: "PALETA", frente: "branding" },
  { id: "landing", rotulo: "LANDING", frente: "web" },
  { id: "legenda", rotulo: "LEGENDA", frente: "social" },
  { id: "campanha", rotulo: "CAMPANHA", frente: "estrategia" },
];

export const VIEW = { w: 1000, h: 700 };
const CENTRO = { x: VIEW.w / 2, y: VIEW.h / 2 };

/** Gerador determinístico: o mesmo "acaso" a cada carga e a cada rebuild. */
function aleatorio(semente) {
  let s = semente;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/**
 * As quatro posições de cada peça.
 * `solto` é bagunça controlada; `grade` alinha; `identidade` aperta a grade
 * e acende a marca; `orbita` fecha o anel em torno da empresa.
 */
export function posicoesDasPecas() {
  const rnd = aleatorio(20260821);

  return PECAS.map((peca, i) => {
    const col = i % 4;
    const lin = Math.floor(i / 4);

    // Bagunça: espalhada, torta e em escalas diferentes.
    const solto = {
      x: 90 + rnd() * (VIEW.w - 300),
      y: 60 + rnd() * (VIEW.h - 200),
      r: -22 + rnd() * 44,
      s: 0.82 + rnd() * 0.42,
    };

    const grade = { x: 108 + col * 232, y: 132 + lin * 210, r: 0, s: 1 };
    const identidade = { x: 128 + col * 224, y: 150 + lin * 196, r: 0, s: 0.96 };

    // Anel: elipse, porque o palco é mais largo que alto.
    const ang = (i / PECAS.length) * Math.PI * 2 - Math.PI / 2;
    const orbita = {
      x: CENTRO.x + Math.cos(ang) * 372 - 72,
      y: CENTRO.y + Math.sin(ang) * 238 - 26,
      r: 0,
      s: 0.74,
    };

    return { ...peca, solto, grade, identidade, orbita, ang };
  });
}

/** Caminho da conexão: uma curva suave do centro até a peça. */
export function caminhoConexao(p) {
  const alvoX = p.orbita.x + 72;
  const alvoY = p.orbita.y + 26;
  const mx = (CENTRO.x + alvoX) / 2;
  const my = (CENTRO.y + alvoY) / 2;
  // Curvatura proporcional à distância: linhas retas fariam uma estrela dura.
  const desvio = 26;
  return `M${CENTRO.x} ${CENTRO.y} Q${mx + desvio} ${my - desvio} ${alvoX} ${alvoY}`;
}

export default function SystemScene({ section }) {
  const pecas = posicoesDasPecas();

  return (
    <div className="sistema" data-sistema>
      <div className="sistema__coluna">
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

        {/* Os quatro estados ocupam o MESMO lugar; só o ativo aparece.
            Empilhados no fluxo, a coluna pularia de altura a cada troca. */}
        <div className="sistema__estados">
          {estadosDoSistema.map((estado, i) => (
            <div className="estado" data-estado={i} key={estado.id}>
              <h3 className="estado__titulo">{estado.titulo}</h3>
              <p className="estado__texto">{estado.texto}</p>
            </div>
          ))}
        </div>

        <p className="sistema__contador" aria-hidden="true">
          <span data-sistema-atual>01</span>
          <span className="sistema__contador-sep">/</span>
          <span>{String(estadosDoSistema.length).padStart(2, "0")}</span>
        </p>
      </div>

      <div className="sistema__palco">
        <svg
          className="sistema__svg"
          viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          {/* Conexões: entram por último, quando o sistema fecha. */}
          <g className="sistema__conexoes">
            {pecas.map((p) => (
              <path
                className="sistema__linha"
                data-conexao
                key={p.id}
                d={caminhoConexao(p)}
                fill="none"
              />
            ))}
          </g>

          {/* O centro: a empresa do leitor, não a Prime. */}
          <g className="sistema__centro" data-centro>
            <circle cx={CENTRO.x} cy={CENTRO.y} r="104" className="sistema__centro-halo" />
            <circle cx={CENTRO.x} cy={CENTRO.y} r="86" className="sistema__centro-anel" />
            <text x={CENTRO.x} y={CENTRO.y - 8} className="sistema__centro-linha1">
              SUA
            </text>
            <text x={CENTRO.x} y={CENTRO.y + 22} className="sistema__centro-linha2">
              EMPRESA
            </text>
          </g>

          {/* As peças. A posição inicial é a bagunça; o resto vem do scroll. */}
          <g className="sistema__pecas">
            {pecas.map((p) => (
              <g
                className="peca"
                data-peca={p.id}
                data-area={p.frente}
                key={p.id}
                transform={`translate(${p.solto.x} ${p.solto.y}) rotate(${p.solto.r} 72 26) scale(${p.solto.s})`}
              >
                <rect className="peca__caixa" width="144" height="52" rx="6" />
                <text className="peca__rotulo" x="72" y="32">
                  {p.rotulo}
                </text>
              </g>
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}
