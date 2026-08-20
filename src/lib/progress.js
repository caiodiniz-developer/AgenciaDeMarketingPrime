/**
 * Progresso do scroll na região das seções, 0 → 1.
 *
 * Um objeto mutável em vez de estado do React: quem escreve é o ScrollTrigger
 * e quem lê é o loop de render do 3D, sessenta vezes por segundo. Passar isso
 * por estado re-renderizaria a árvore inteira a cada quadro.
 */
export const storyProgress = { value: 0 };
