/**
 * O palco dos serviços: uma composição própria por frente.
 *
 * A regra da seção é "não diga o que a gente faz, mostre". Um ícone de
 * lâmpada para "ideia" ou de foguete para "crescimento" diria a categoria
 * sem dizer o trabalho — e é o que faz uma página parecer template.
 * Aqui cada frente aparece na SUA linguagem: o feed se montando, a timeline
 * cortando, o grid de marca se construindo.
 *
 * Todas as composições ficam montadas o tempo todo e só a ativa acende. O
 * escalonamento é CSS puro, por `--i`: seis timelines de GSAP para trocar
 * ilustração seria trabalho e memória à toa.
 */

const VIEW = "0 0 320 320";

const svgBase = {
  viewBox: VIEW,
  fill: "none",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  vectorEffect: "non-scaling-stroke",
};

/** SOCIAL — o feed se montando, com o post em destaque. */
function Social() {
  const celulas = Array.from({ length: 9 }, (_, i) => i);
  return (
    <svg {...svgBase}>
      <rect className="pl-quadro" x="40" y="24" width="240" height="272" rx="10" />
      <line className="pl-linha" x1="40" y1="72" x2="280" y2="72" />
      <circle className="pl-cheio" cx="64" cy="48" r="10" />
      <rect className="pl-barra" x="84" y="43" width="72" height="5" rx="2.5" />

      {celulas.map((i) => (
        <rect
          key={i}
          className="pl-celula"
          style={{ "--i": i }}
          x={52 + (i % 3) * 76}
          y={88 + Math.floor(i / 3) * 70}
          width="68"
          height="62"
          rx="5"
        />
      ))}
      <rect className="pl-destaque" style={{ "--i": 9 }} x="128" y="158" width="68" height="62" rx="5" />
    </svg>
  );
}

/** AUDIOVISUAL — quadros numa timeline, playhead correndo, timecode. */
function Audiovisual() {
  const quadros = Array.from({ length: 5 }, (_, i) => i);
  return (
    <svg {...svgBase}>
      <rect className="pl-quadro" x="28" y="52" width="264" height="132" rx="8" />
      {/* Marcas de viewfinder: sugerem enquadramento sem desenhar uma câmera. */}
      <path className="pl-linha" d="M48 72V60h14M272 72V60h-14M48 164v12h14M272 164v12h-14" />
      <circle className="pl-cheio pl-rec" cx="264" cy="70" r="5" />

      <line className="pl-linha" x1="28" y1="222" x2="292" y2="222" />
      {quadros.map((i) => (
        <rect
          key={i}
          className="pl-celula"
          style={{ "--i": i }}
          x={28 + i * 54}
          y="232"
          width="46"
          height="40"
          rx="4"
        />
      ))}
      <line className="pl-playhead" data-playhead x1="28" y1="212" x2="28" y2="282" />
      <text className="pl-texto" x="28" y="300">
        00:00:15:04
      </text>
    </svg>
  );
}

/** DESIGN — o grid editorial se organizando em peça. */
function Design() {
  const guias = [80, 128, 176, 224];
  return (
    <svg {...svgBase}>
      <rect className="pl-quadro" x="40" y="32" width="240" height="256" rx="8" />
      {guias.map((x, i) => (
        <line key={x} className="pl-guia" style={{ "--i": i }} x1={x} y1="32" x2={x} y2="288" />
      ))}

      <rect className="pl-bloco" style={{ "--i": 0 }} x="64" y="60" width="192" height="72" rx="4" />
      <rect className="pl-barra" style={{ "--i": 1 }} x="64" y="150" width="150" height="9" rx="4.5" />
      <rect className="pl-barra" style={{ "--i": 2 }} x="64" y="170" width="110" height="9" rx="4.5" />
      <rect className="pl-celula" style={{ "--i": 3 }} x="64" y="200" width="88" height="60" rx="4" />
      <rect className="pl-celula" style={{ "--i": 4 }} x="164" y="200" width="92" height="60" rx="4" />
      <rect className="pl-destaque" style={{ "--i": 5 }} x="64" y="60" width="52" height="72" rx="4" />
    </svg>
  );
}

/** BRANDING — símbolo construído sobre grid, com a paleta descendo. */
function Branding() {
  const cores = ["var(--color-gold)", "var(--color-bone)", "#7d7566", "#2a2721"];
  return (
    <svg {...svgBase}>
      <g className="pl-construcao">
        <circle className="pl-guia" style={{ "--i": 0 }} cx="160" cy="140" r="86" />
        <circle className="pl-guia" style={{ "--i": 1 }} cx="160" cy="140" r="56" />
        <line className="pl-guia" style={{ "--i": 2 }} x1="160" y1="34" x2="160" y2="246" />
        <line className="pl-guia" style={{ "--i": 3 }} x1="54" y1="140" x2="266" y2="140" />
      </g>

      {/* O "P" da Prime, desenhado em traço sobre a construção. */}
      <path
        className="pl-simbolo"
        d="M126 196V84h44a34 34 0 0 1 0 68h-44"
        strokeWidth="10"
      />

      {cores.map((c, i) => (
        <rect
          key={i}
          className="pl-amostra"
          style={{ "--i": i + 4 }}
          x={68 + i * 48}
          y="256"
          width="40"
          height="28"
          rx="3"
          fill={c}
        />
      ))}
    </svg>
  );
}

/** WEB — a interface se montando dentro da janela. */
function Web() {
  return (
    <svg {...svgBase}>
      <rect className="pl-quadro" x="28" y="52" width="264" height="216" rx="10" />
      <line className="pl-linha" x1="28" y1="86" x2="292" y2="86" />
      <circle className="pl-ponto" cx="46" cy="69" r="4" />
      <circle className="pl-ponto" cx="60" cy="69" r="4" />
      <circle className="pl-ponto" cx="74" cy="69" r="4" />
      <rect className="pl-barra" x="96" y="64" width="120" height="10" rx="5" />

      <rect className="pl-bloco" style={{ "--i": 0 }} x="48" y="104" width="224" height="72" rx="5" />
      <rect className="pl-barra" style={{ "--i": 1 }} x="48" y="190" width="140" height="9" rx="4.5" />
      <rect className="pl-barra" style={{ "--i": 2 }} x="48" y="208" width="96" height="9" rx="4.5" />
      <rect className="pl-destaque" style={{ "--i": 3 }} x="48" y="232" width="84" height="24" rx="12" />
      <rect className="pl-celula" style={{ "--i": 4 }} x="196" y="190" width="76" height="66" rx="5" />
    </svg>
  );
}

/** ESTRATÉGIA — a decisão: caminhos avaliados, um escolhido. */
function Estrategia() {
  return (
    <svg {...svgBase}>
      <circle className="pl-cheio" cx="52" cy="160" r="9" />

      <path className="pl-rota" style={{ "--i": 0 }} d="M52 160C120 160 128 66 236 66" />
      <path className="pl-rota" style={{ "--i": 1 }} d="M52 160C120 160 132 254 236 254" />
      <path className="pl-rota pl-rota--eleita" style={{ "--i": 2 }} d="M52 160C130 160 150 160 236 160" />

      <circle className="pl-no" style={{ "--i": 3 }} cx="236" cy="66" r="12" />
      <circle className="pl-no" style={{ "--i": 4 }} cx="236" cy="254" r="12" />
      <circle className="pl-alvo" style={{ "--i": 5 }} cx="236" cy="160" r="18" />
      <circle className="pl-cheio pl-alvo-miolo" style={{ "--i": 6 }} cx="236" cy="160" r="6" />

      <rect className="pl-barra" style={{ "--i": 7 }} x="196" y="292" width="80" height="7" rx="3.5" />
    </svg>
  );
}

const PALCOS = {
  social: Social,
  audiovisual: Audiovisual,
  design: Design,
  branding: Branding,
  web: Web,
  estrategia: Estrategia,
};

export default function ServiceStage({ id }) {
  const Palco = PALCOS[id];
  if (!Palco) return null;
  return (
    <div className="palco" data-palco={id} aria-hidden="true">
      <Palco />
    </div>
  );
}

export const PALCOS_DISPONIVEIS = Object.keys(PALCOS);
