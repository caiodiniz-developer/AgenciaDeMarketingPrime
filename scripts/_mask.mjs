import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:"new",args:["--no-sandbox"]});
const p = await b.newPage();
await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:5314/", {waitUntil:"networkidle2"});
await p.evaluate(() => document.fonts.ready);
await new Promise(r=>setTimeout(r,3500));
console.log(await p.evaluate(() => {
  const h2 = document.querySelector('[data-sec="oficio"] [data-sec-title]');
  const line = h2.querySelector('div,span');
  const cs = getComputedStyle(h2);
  return {
    html: h2.outerHTML.slice(0, 420),
    fontSize: cs.fontSize, lineHeight: cs.lineHeight,
    maskClass: line?.className,
    maskOverflow: line ? getComputedStyle(line).overflow : null,
    text: h2.textContent,
  };
}));
await b.close();
