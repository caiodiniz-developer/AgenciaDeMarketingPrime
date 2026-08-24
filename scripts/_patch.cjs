const fs = require("fs");
let s = fs.readFileSync("src/components/NavBar.jsx", "utf8");

s = s.replace(
  `  useEffect(() => {
    const alvos = navItems
      .map(({ id }) => document.getElementById(id))
      .filter(Boolean);
    if (!alvos.length) return undefined;`,
  `  useEffect(() => {
    /* A barra tem quatro entradas e a página tem onze seções. Sem este mapa,
       o indicador ficava preso na última seção que POR ACASO estava no menu:
       durante Estratégia ele continuava apontando "Web", que é a entrada
       anterior — e uma barra que aponta para o lugar errado é pior do que uma
       barra sem indicador. */
    const DONO = {
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
    };

    const alvos = Object.keys(DONO)
      .map((id) => document.getElementById(id))
      .filter(Boolean);
    if (!alvos.length) return undefined;`
);

s = s.replace(
  `        dentro.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setSecao(dentro[0].target.id);`,
  `        dentro.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setSecao(DONO[dentro[0].target.id] || null);`
);

fs.writeFileSync("src/components/NavBar.jsx", s);
console.log(s.includes("const DONO = {") ? "ok" : "FALHOU");
