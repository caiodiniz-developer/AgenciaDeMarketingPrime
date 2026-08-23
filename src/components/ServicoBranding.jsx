import { Rich, Title, Numero } from "./Peca";

/**
 * BRANDING — a marca sendo CONSTRUÍDA, não exibida pronta.
 *
 * Mostrar logos acabadas prova que alguém tem um portfólio; mostrar a
 * construção prova que existe método. A seção é presa e o scroll percorre a
 * ordem real de um trabalho de identidade:
 *
 *   grade de construção → formas → símbolo → tipografia → cor → aplicação
 *
 * Tudo é SVG desenhado aqui, com `stroke-dasharray`: as linhas-guia aparecem
 * como quem risca no papel. Um GIF de logo girando faria o oposto — pareceria
 * template comprado.
 *
 * Tema claro por decisão de ritmo: depois de três seções pretas seguidas, o
 * bege é o respiro que faz a próxima escuridão voltar a impressionar. E papel
 * é onde identidade visual de fato se decide.
 */

/** Camadas do SVG, na ordem em que a coreografia as acende. */
export default function ServicoBranding({ section, servico }) {
  return (
    <div className="branding" data-branding>
      <div className="branding__texto">
        <Numero numero={servico.numero} nome={servico.nome} />
        <Title lines={servico.chamada} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={servico.corpo} />
        </p>
      </div>

      <div className="branding__palco">
        {/* A coluna do desenho é o bloco de contenção da marca: sem ela, a
           marca se centrava sobre o PALCO inteiro — que inclui a coluna das
           especificações — e ia parar em cima da paleta. */}
        <div className="branding__desenho">
        <svg
          className="branding__svg"
          viewBox="0 0 520 520"
          role="img"
          aria-label="Construção de uma identidade visual: grade, símbolo, tipografia e paleta"
          data-branding-svg
        >
          {/* 1 · Grade de construção — o papel milimetrado do trabalho. */}
          <g className="bd-grade" data-bd="grade">
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`v${i}`} x1={60 + i * 50} y1="60" x2={60 + i * 50} y2="460" data-bd-linha />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line key={`h${i}`} x1="60" y1={60 + i * 50} x2="460" y2={60 + i * 50} data-bd-linha />
            ))}
          </g>

          {/* 2 · Guias geométricas — a circunferência e as diagonais de onde
                 o símbolo é tirado. */}
          <g className="bd-guias" data-bd="guias">
            <circle cx="260" cy="260" r="160" data-bd-guia />
            <circle cx="260" cy="260" r="100" data-bd-guia />
            <line x1="100" y1="100" x2="420" y2="420" data-bd-guia />
            <line x1="420" y1="100" x2="100" y2="420" data-bd-guia />
          </g>

          {/* 3 · A circunferência de fora, que fecha a construção. */}
          <g className="bd-simbolo" data-bd="simbolo">
            <circle cx="260" cy="260" r="140" data-bd-traco />
          </g>

          {/* 4 · Cotas: o detalhe que diz "isto foi medido, não improvisado". */}
          <g className="bd-cotas" data-bd="cotas">
            <line x1="150" y1="120" x2="150" y2="300" data-bd-cota />
            <line x1="142" y1="120" x2="158" y2="120" data-bd-cota />
            <line x1="142" y1="300" x2="158" y2="300" data-bd-cota />
            <text x="132" y="215" data-bd-texto>
              2x
            </text>
            <line x1="190" y1="440" x2="380" y2="440" data-bd-cota />
            <text x="275" y="462" data-bd-texto textAnchor="middle">
              3x
            </text>
          </g>
        </svg>

        {/* A MARCA DE VERDADE, no centro da construção.
            Antes havia aqui um "P" que eu desenhei em SVG. Numa seção que
            vende identidade visual, exibir um símbolo inventado no lugar da
            marca real da empresa é o erro mais caro possível: a peça que
            deveria provar competência passava a provar o contrário. */}
        <div className="branding__marca" data-bd-marca>
          <img src="/logo-mark.png" alt="Marca da Agência Prime" />
        </div>
        </div>

        {/* 5 · Tipografia e cor entram como DOM, não como SVG: são texto e
               precisam ser texto — inclusive para quem lê com leitor de tela. */}
        <div className="branding__specs">
          <div className="spec" data-bd-spec="tipo">
            <span className="spec__rotulo">Tipografia</span>
            <span className="spec__amostra spec__amostra--titulo">Aa</span>
            <span className="spec__nota">Títulos · League Spartan</span>
            <span className="spec__amostra spec__amostra--corpo">Aa</span>
            <span className="spec__nota">Textos · Playfair Display</span>
          </div>

          <div className="spec" data-bd-spec="cor">
            <span className="spec__rotulo">Paleta</span>
            <ul className="spec__cores">
              {[
                ["#0A0A0A", "Base"],
                ["#C9A84C", "Destaque"],
                ["#D9D9D9", "Apoio"],
                ["#FFFFFF", "Contraste"],
              ].map(([hex, nome]) => (
                <li key={hex} data-bd-cor>
                  <i style={{ background: hex }} />
                  <b>{nome}</b>
                  <em>{hex}</em>
                </li>
              ))}
            </ul>
          </div>

          <div className="spec" data-bd-spec="aplicacao">
            <span className="spec__rotulo">Aplicações</span>
            <ul className="spec__aplicacoes">
              {["Perfil", "Fachada", "Uniforme", "Frota", "Papelaria", "Assinatura"].map((a) => (
                <li key={a} data-bd-aplicacao>
                  {a}
                </li>
              ))}
            </ul>
          </div>
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
