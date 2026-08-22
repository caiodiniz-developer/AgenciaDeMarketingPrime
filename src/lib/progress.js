/**
 * Estado compartilhado da cena 3D.
 *
 * Um objeto mutável em vez de estado do React: quem escreve é o ScrollTrigger,
 * sessenta vezes por segundo, e quem lê é o loop de render. Passar isso por
 * estado re-renderizaria a árvore inteira a cada quadro.
 *
 * O NOTEBOOK NÃO TELETRANSPORTA. Antes cada seção fixava uma pose e o objeto
 * era apagado durante o salto — o truque de teatro. Agora existe UMA timeline
 * contínua conduzida pelo scroll: a pose é interpolada de seção para seção e o
 * caminho inteiro fica à vista. Sair de cena é viajar para fora do quadro
 * (|x| > 1.6), não desaparecer.
 *
 * Este módulo não importa nada do three.js de propósito: importá-lo de dentro
 * de LaptopScene seria um import estático do módulo 3D, e isso anula o
 * `lazy()` — o empacotador passaria a pôr o three.js inteiro no bundle
 * principal, na frente da hero.
 */

/** Pose de repouso, fora do quadro à direita. */
export const FORA = { x: 1.9, y: -0.1, scale: 0.6, rotY: -0.8, rotX: 0.1 };

export const cena = {
  /**
   * Pose corrente do modelo, escrita pela timeline global com scrub.
   * x, y: -1 = borda esquerda/inferior da janela, +1 = direita/superior.
   * Além de ±1.6 o objeto está fora do quadro.
   */
  pose: { ...FORA },

  /**
   * Aproximação final da seção Web, de 0 a 1.
   *
   * Vive separada da pose porque é outra coisa: a pose é o objeto andando
   * pelo palco, isto é a CÂMERA entrando na tela. Somadas no mesmo número,
   * um resize no meio da aproximação faria o objeto saltar.
   */
  zoom: 0,

  /**
   * Canal exibido na tela do notebook. Trocar dispara um crossfade na
   * textura — a tela nunca corta.
   */
  canal: "social",

  /** Ligado enquanto a região da narrativa está na viewport. */
  ativo: false,
};

/**
 * Canais da tela.
 *
 * `video` aponta para um arquivo real em /public/videos; a tela mostra
 * trabalho da Prime, não um mockup desenhado. O canal "prime" é o fecho: a
 * própria hero rodando dentro do notebook, que é a piada visual que amarra a
 * narrativa — o site que você está vendo, dentro do objeto que o apresentou.
 */
export const CANAIS = {
  social: "/videos/social-sm.mp4",
  web: "/videos/web-sm.mp4",
  design: "/videos/design-sm.mp4",
  prime: "/media/hero-480.mp4",
};
