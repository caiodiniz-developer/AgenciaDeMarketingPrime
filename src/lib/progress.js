/**
 * Estado compartilhado da cena 3D.
 *
 * Um objeto mutável em vez de estado do React: quem escreve é o ScrollTrigger
 * e quem lê é o loop de render, sessenta vezes por segundo. Passar isso por
 * estado re-renderizaria a árvore inteira a cada quadro.
 *
 * A pose vem da SEÇÃO ATIVA, não de um progresso global da narrativa.
 * O global só funcionaria se todas as seções tivessem a mesma altura de
 * scroll — e não têm: as seções presas consomem três a quatro telas cada,
 * então o mapa "índice ÷ total" erra por seções inteiras e o modelo aparece
 * onde não devia.
 */
/**
 * Pose de "fora de cena", à direita do quadro.
 *
 * Mora aqui, e não em LaptopScene, de propósito: importá-la de lá seria um
 * import estático do módulo do 3D, e isso anula o `lazy()` — o empacotador
 * passa a colocar o three.js inteiro no bundle principal, na frente da hero.
 */
export const FORA = { x: 1.9, y: -0.1, scale: 0.6, rotY: -0.8, rotX: 0.1 };

export const cena = {
  /** Pose alvo do modelo. `null` = fora de cena. */
  pose: null,

  /**
   * Verdadeiro quando o modelo está apagado.
   *
   * Enquanto está invisível, a pose SALTA em vez de perseguir o alvo: entre
   * duas seções ele pode ter de atravessar a tela inteira, e deslizando
   * reaparece no meio do caminho, por cima do conteúdo que acabou de entrar.
   * Teletransportar no escuro é o truque mais velho do teatro.
   */
  oculto: false,
};
