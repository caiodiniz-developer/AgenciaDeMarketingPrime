/**
 * Vocabulário de movimento do projeto.
 *
 * Existe para que "quanto tempo" e "com que curva" sejam decisões tomadas uma
 * vez, e não improvisadas em cada componente. Quando os números vivem espalhados,
 * o site inteiro perde o mesmo ritmo — e é o ritmo que faz parecer intencional.
 */

/** Curvas. Entradas sempre `.out`: a coisa já vinha vindo e chega. */
export const EASE = {
  /** Entrada padrão de texto e UI. */
  out: "power3.out",
  /** Entrada com mais freio no fim — títulos grandes. */
  outLong: "power4.out",
  /** O freio mais seco que ainda parece natural — reveals cinematográficos. */
  expo: "expo.out",
  /** Movimento que vai e volta (parallax, deslocamentos). */
  inOut: "power2.inOut",
  /** Retorno de elemento magnético. Elástico discretíssimo. */
  spring: "elastic.out(1, 0.55)",
};

/** Durações em segundos, por natureza do movimento. */
export const DUR = {
  micro: 0.25, // feedback imediato: hover, cor, borda
  ui: 0.45, // estado de interface
  reveal: 0.9, // entrada de conteúdo
  cinema: 1.4, // movimento de câmera, grandes massas
};

/**
 * Ritmo de um stagger. Não é fila: é o intervalo que faz um grupo parecer
 * matéria em vez de sprite.
 */
export const STAGGER = {
  chars: 0.02,
  words: 0.045,
  lines: 0.09,
  items: 0.11,
};

/**
 * Hierarquia de entrada de uma seção, em posições de timeline.
 *
 * Os valores se SOBREPÕEM de propósito: se o título só começa quando o rótulo
 * termina, e o texto só quando o título termina, a seção entra em degraus e
 * denuncia a máquina. Cada elemento parte antes de o anterior assentar.
 */
export const BEAT = {
  label: 0,
  title: 0.12,
  body: 0.34,
  items: 0.52,
  cta: 0.7,
};

/**
 * Quanto cada camada anda em relação ao scroll. É isto que cria profundidade:
 * o fundo se arrasta, o conteúdo acompanha, o detalhe se adianta.
 */
export const DEPTH = {
  back: 0.3,
  mid: 0.6,
  front: 1,
  detail: 1.18,
};

/** Distância vertical por peso do elemento — título anda mais que legenda. */
export const SHIFT = {
  title: 110, // em % da própria linha, para máscara
  body: 22,
  item: 34,
  label: 16,
};
