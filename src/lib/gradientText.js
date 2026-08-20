/**
 * Pinta um gradiente contínuo através de várias fatias de texto (chars do
 * SplitText, linhas de um título) como se fosse um único bloco.
 *
 * Sem isso, cada fatia recebe a rampa inteira e o título vira listras —
 * e não dá para pôr o gradiente no pai, porque `background-clip: text`
 * pinta o fundo DO PAI: animar a opacidade da fatia não apagaria a cor.
 * Cada fatia carregando a sua fração resolve os dois problemas.
 */
export function paintGradientAcross(host, parts, gradient) {
  if (!host || !parts?.length) return;

  const box = host.getBoundingClientRect();
  if (!box.height) return;

  parts.forEach((part) => {
    const top = part.getBoundingClientRect().top - box.top;

    Object.assign(part.style, {
      backgroundImage: gradient,
      backgroundSize: `100% ${box.height}px`,
      backgroundPosition: `0 ${-top}px`,
      backgroundRepeat: "no-repeat",
      webkitBackgroundClip: "text",
      backgroundClip: "text",
      webkitTextFillColor: "transparent",
      color: "transparent",
    });
  });
}

/** Lê um token de gradiente do :root para não duplicar a cor em JS. */
export function gradientToken(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
