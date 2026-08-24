/**
 * Estado compartilhado da cena 3D.
 *
 * Um objeto mutável em vez de estado do React: quem escreve é o ScrollTrigger,
 * sessenta vezes por segundo, e quem lê é o loop de render. Passar isso por
 * estado re-renderizaria a árvore inteira a cada quadro.
 *
 * O NOTEBOOK NÃO TELETRANSPORTA. Existe UMA timeline contínua conduzida pelo
 * scroll: a pose é interpolada de seção para seção e o caminho inteiro fica à
 * vista. Sair de cena é viajar para fora do quadro ou APAGAR devagar — nunca
 * pular de um lado ao outro entre dois quadros.
 *
 * Este módulo não importa nada do three.js de propósito: importá-lo de dentro
 * de LaptopScene seria um import estático do módulo 3D, e isso anula o
 * `lazy()` — o empacotador passaria a pôr o three.js inteiro no bundle
 * principal, na frente da hero.
 */

/**
 * O NASCIMENTO.
 *
 * O objeto não existe durante a hero. Ele nasce no escuro entre a hero e o
 * manifesto: minúsculo, no centro, longe, tombado para trás — e cresce até a
 * primeira pose. Entrar deslizando pela borda seria "mais um elemento
 * chegando"; nascer do fundo é um começo.
 */
export const NASCIMENTO = { x: 0, y: -0.08, scale: 0.13, rotY: -0.4, rotX: 0.42 };

/** Compatibilidade: a pose de repouso é a de nascimento. */
export const FORA = NASCIMENTO;

export const cena = {
  /**
   * Pose corrente do modelo, escrita pela timeline global com scrub.
   * x, y: -1 = borda esquerda/inferior da janela, +1 = direita/superior.
   * Além de ±1.6 o objeto está fora do quadro.
   */
  pose: { ...NASCIMENTO },

  /**
   * Aproximação final da seção Web, de 0 a 1.
   *
   * Vive separada da pose porque é outra coisa: a pose é o objeto andando
   * pelo palco, isto é a CÂMERA entrando na tela. Somadas no mesmo número,
   * um resize no meio da aproximação faria o objeto saltar.
   */
  zoom: 0,

  /**
   * Presença, de 0 a 1.
   *
   * O fio condutor precisa de PAUSA. Um objeto que nunca sai de cena deixa de
   * ser presença e vira moldura: o olho para de registrá-lo. Nas seções que
   * têm palco próprio — a construção da marca, o campo das forças — ele se
   * apaga, o site respira, e a volta no fecho volta a valer alguma coisa.
   *
   * Apagar não é teletransportar: a pose continua correndo por baixo, então
   * quando ele reacende já está no lugar certo do trajeto.
   */
  presenca: 1,

  /**
   * A seção em cena quer o objeto? 0 ou 1, em degrau.
   *
   * Separado de `nascido` porque os dois mudam em ritmos diferentes, e
   * separado de `presenca` porque esta é o PRODUTO dos dois — calculado no
   * loop de render, onde os dois valores estão sempre atuais.
   */
  presente: 1,

  /**
   * Quanto do NASCIMENTO já aconteceu, de 0 a 1.
   *
   * Fica separado de `presenca` porque são duas autoridades diferentes: a
   * presença é decidida pela seção em cena, o nascimento por um único trecho
   * de scroll no começo da narrativa. Guardados no mesmo número, o gatilho da
   * primeira seção — que diz "presente" a cada quadro — apagava a rampa de
   * nascimento e o objeto surgia pronto. Multiplicados, cada um manda no que
   * é seu.
   */
  nascido: 0,

  /**
   * Fechamento da tampa, de 0 (aberta) a 1 (quase encostada).
   *
   * Só o último movimento da narrativa usa isto. Nunca chega a 1 de verdade:
   * uma tampa encostada some, e o que se quer ver é o gesto.
   */
  tampa: 0,

  /**
   * Giro lento acrescentado ao longo da narrativa inteira, em radianos.
   *
   * As poses por seção dizem PARA ONDE o objeto vai; isto faz com que ele
   * nunca esteja completamente parado no caminho. Sem esse acréscimo, entre
   * duas poses o notebook fica imóvel — e objeto imóvel numa página que rola
   * lê como imagem colada, não como coisa no espaço.
   */
  giro: 0,

  /**
   * Ângulo da varredura dourada no alumínio, em voltas.
   * Conduzido pelo scroll: o reflexo corre quando a página corre.
   */
  brilho: 0,

  /**
   * Canal exibido na tela do notebook. Trocar dispara um crossfade na
   * textura — a tela nunca corta.
   */
  canal: "social",

  /** Ligado enquanto a região da narrativa está na viewport. */
  ativo: false,

  /** Qual faixa de seção está mandando na cena. Só diagnóstico. */
  secao: null,
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
  branding: "/videos/branding-sm.mp4",
  prime: "/media/hero-480.mp4",
};

/**
 * Sonda: o caminho do notebook é a única animação do site que não se
 * inspeciona pelo DOM. Sem isto, "o objeto está no lugar errado" vira
 * adivinhação — e foi assim que a orientação do modelo se resolveu.
 *
 * Os campos são copiados UM A UM, e não com espalhamento: o GSAP pendura um
 * `_gsap` no alvo que aponta de volta para ele, e `{ ...cena.pose }` arrasta
 * essa referência circular junto. Serializar o resultado explodia, e o canal
 * do Puppeteer engolia o erro devolvendo `undefined` — a sonda parecia
 * simplesmente não existir.
 */
if (typeof window !== "undefined") {
  window.__cena = () => ({
    x: cena.pose.x,
    y: cena.pose.y,
    scale: cena.pose.scale,
    rotY: cena.pose.rotY,
    rotX: cena.pose.rotX,
    zoom: cena.zoom,
    presenca: cena.presenca,
    tampa: cena.tampa,
    canal: cena.canal,
    secao: cena.secao,
  });
}
