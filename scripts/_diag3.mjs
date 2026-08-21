import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:"new",args:["--no-sandbox"]});
const p = await b.newPage();
await p.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"no-preference"}]);
p.on("pageerror", e => console.log("[pageerror]", e.message));
await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:5343/", {waitUntil:"networkidle2"});
await p.evaluate(() => document.fonts.ready);
await new Promise(r=>setTimeout(r,4500));

await p.evaluate(() => {
  const el = document.getElementById("oficio");
  window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top);
});
await new Promise(r=>setTimeout(r,2000));

// Onde estão os itens de verdade?
const info = await p.evaluate(() => {
  const itens = [...document.querySelectorAll("[data-service]")];
  return itens.map(li => {
    const r = li.getBoundingClientRect();
    return { s: li.dataset.service, top: Math.round(r.top), h: Math.round(r.height), left: Math.round(r.left), op: getComputedStyle(li).opacity, vis: getComputedStyle(li).visibility };
  });
});
console.log("itens:", info);

const alvo = info[1];
const px = alvo.left + 80, py = alvo.top + Math.round(alvo.h/2);
console.log("mirando", px, py);
console.log("elemento nesse ponto:", await p.evaluate(([x,y]) => {
  const e = document.elementFromPoint(x,y);
  return e ? `${e.tagName}.${e.className}` : "nenhum";
}, [px,py]));

await p.mouse.move(px-200, py);
await new Promise(r=>setTimeout(r,150));
await p.mouse.move(px, py);
await new Promise(r=>setTimeout(r,900));

console.log("depois do hover:", await p.evaluate(() => {
  const itens = [...document.querySelectorAll("[data-service]")];
  const prev = document.querySelector("[data-services-preview]");
  return {
    ativos: itens.map(e => e.dataset.active),
    hovering: document.querySelector("[data-services]").dataset.hovering,
    previewOp: getComputedStyle(prev).opacity,
  };
}));
await b.close();
