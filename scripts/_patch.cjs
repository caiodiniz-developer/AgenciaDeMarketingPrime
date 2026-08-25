const fs = require("fs");

/* ── A navegação ──────────────────────────────────────────────────────── */
let c = fs.readFileSync("src/content/story.js", "utf8");
c = c.replace(
  `/** Navegação: derivada das seções, para não existirem duas listas. */
export const navItems = [
  { id: "servicos", label: "O que fazemos" },
  { id: "web", label: "Web" },
  { id: "metodo", label: "Como funciona" },
  { id: "clientes", label: "Quem confia" },
];`,
  `/**
 * Navegação.
 *
 * "Web" saiu: era uma das cinco frentes ocupando um lugar de primeiro nível
 * ao lado de "O que fazemos", que já leva às cinco. No lugar dela entra
 * NOSSO DIFERENCIAL, apontando para a seção que de fato faz esse argumento —
 * as cinco forças que sustentam uma marca.
 *
 * A ordem segue a da PÁGINA, e não a da importância: uma barra que lista
 * seções fora da ordem em que elas aparecem faz o leitor procurar para cima
 * o que está para baixo.
 */
export const navItems = [
  { id: "servicos", label: "O que fazemos" },
  { id: "metodo", label: "Como funciona" },
  { id: "porque", label: "Nosso diferencial" },
  { id: "clientes", label: "Quem confia" },
];`
);
fs.writeFileSync("src/content/story.js", c);

/* ── O mapa seção → item da barra ─────────────────────────────────────── */
let n = fs.readFileSync("src/components/NavBar.jsx", "utf8");
n = n.replace(
  `    const DONO = {
      manifesto: "servicos",
      servicos: "servicos",
      social: "servicos",
      web: "web",
      design: "servicos",
      branding: "servicos",
      estrategia: "servicos",
      metodo: "metodo",
      porque: "metodo",
      clientes: "clientes",
      contato: "clientes",
    };`,
  `    const DONO = {
      manifesto: "servicos",
      servicos: "servicos",
      /* As cinco frentes pertencem todas a "O que fazemos": são o
         desenvolvimento daquele índice, não destinos de primeiro nível. */
      social: "servicos",
      web: "servicos",
      design: "servicos",
      branding: "servicos",
      estrategia: "servicos",
      metodo: "metodo",
      porque: "porque",
      clientes: "clientes",
      contato: "clientes",
    };`
);
fs.writeFileSync("src/components/NavBar.jsx", n);

console.log("ok");
