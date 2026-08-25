import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:"new",args:["--no-sandbox","--mute-audio"]});
const p = await b.newPage();
p.on("console", m => { if(m.type()==="error") console.log("CONSOLE:", m.text().slice(0,300)); });
p.on("pageerror", e => console.log("PAGEERROR:", String(e).slice(0,500)));
await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:5402/", {waitUntil:"networkidle2"});
await new Promise(r=>setTimeout(r,3000));
console.log(await p.evaluate(()=>({
  secs: [...document.querySelectorAll("[data-sec]")].map(e=>e.getAttribute("data-sec")),
  nav: [...document.querySelectorAll(".nav a, .nav button")].map(e=>e.textContent.trim()),
  bodyLen: document.body.innerText.length,
})));
await b.close();
