import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:"new",args:["--no-sandbox","--mute-audio","--autoplay-policy=no-user-gesture-required"]});
const p = await b.newPage();
p.on("pageerror", e => console.log("PAGEERROR:", String(e).slice(0,300)));
p.on("console", m => { const t=m.text(); if(t.includes("cena 3D")||m.type()==="error") console.log("C:", t.slice(0,300)); });
p.on("requestfailed", r => console.log("REQFAIL:", r.url().slice(0,120)));
await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:5402/", {waitUntil:"networkidle2"});
for (const f of [0.2,0.35,0.5]) {
  await p.evaluate((y)=>window.scrollTo(0,y), 0);
  await p.evaluate((f)=>window.scrollTo(0, document.body.scrollHeight*f), f);
  await new Promise(r=>setTimeout(r,3500));
  console.log(f, await p.evaluate(()=>({
    canvas: !!document.querySelector("canvas"),
    cena: window.__cena ? window.__cena() : null,
    laptop: window.__laptop ? "sim" : "nao",
  })));
}
await b.close();
