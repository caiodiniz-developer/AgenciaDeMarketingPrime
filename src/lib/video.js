/**
 * Autoplay dos vídeos de fundo.
 *
 * POR QUE NÃO SCROLLTRIGGER
 * A versão anterior ligava cada vídeo com um ScrollTrigger amarrado à seção.
 * Numa seção PRESA isso não funciona: durante o pin o elemento sai do fluxo e,
 * em repouso, o ScrollTrigger o deixa na posição do FIM do espaçador. O
 * gatilho nascia uma seção inteira atrasado — e como ele também era quem
 * trocava o `preload` de `none` para `auto`, o vídeo nunca chegava a carregar.
 * Metade dos fundos do site ficava em `readyState: 0`, parada no poster.
 *
 * O `IntersectionObserver` não sabe nada de pin, de espaçador nem de scroll:
 * ele pergunta ao navegador se o pixel está na tela. É a pergunta certa.
 *
 * DECODIFICAR CUSTA
 * Vídeo fora de tela continua consumindo CPU e bateria se ficar tocando, e um
 * `preload="auto"` em nove arquivos ao mesmo tempo é dezenas de megabytes que
 * ninguém pediu. Por isso: carrega ao chegar perto, toca ao entrar, pausa ao
 * sair.
 */

/** Um observador só para a página inteira. */
let observador = null;

/** Quantos componentes ainda dependem dele. */
let clientes = 0;

const ligar = (v) => {
  /* React escreve a PROPRIEDADE `muted`, mas o iOS lê o ATRIBUTO — e sem ele
     o autoplay é recusado sem aviso. */
  v.muted = true;
  v.defaultMuted = true;
  v.setAttribute("muted", "");
  if (v.preload !== "auto") v.preload = "auto";
  const p = v.play();
  /* A promessa é rejeitada quando a aba está oculta ou a política do
     navegador barra o autoplay. Não é erro nosso e não há o que fazer: o
     poster continua no lugar. */
  if (p && typeof p.catch === "function") p.catch(() => {});
};

function garantirObservador() {
  if (observador) return observador;

  observador = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        const v = e.target;
        if (e.isIntersecting) ligar(v);
        else if (!v.paused) v.pause();
      }
    },
    {
      /* Margem generosa: o vídeo já está tocando quando a seção chega, em vez
         de começar do primeiro quadro na frente do leitor. */
      rootMargin: "35% 0px 35% 0px",
      threshold: 0,
    }
  );

  return observador;
}

/**
 * Passa a cuidar de todos os `<video data-fundo>` dentro de `raiz`.
 * Devolve a limpeza.
 */
export function autoplayDeFundo(raiz = document) {
  if (typeof IntersectionObserver === "undefined") return () => {};

  const obs = garantirObservador();
  const alvos = [...raiz.querySelectorAll("video[data-fundo]")];
  alvos.forEach((v) => obs.observe(v));
  clientes += 1;

  /* Reagir também à aba: um vídeo tocando numa aba escondida é bateria
     queimada, e o navegador não pausa sozinho. */
  const onVisibilidade = () => {
    alvos.forEach((v) => {
      if (document.hidden) v.pause();
      else if (v.getBoundingClientRect().top < window.innerHeight * 1.35) ligar(v);
    });
  };
  document.addEventListener("visibilitychange", onVisibilidade);

  return () => {
    document.removeEventListener("visibilitychange", onVisibilidade);
    alvos.forEach((v) => {
      obs.unobserve(v);
      v.pause();
    });
    clientes -= 1;
    if (clientes <= 0) {
      obs.disconnect();
      observador = null;
      clientes = 0;
    }
  };
}
