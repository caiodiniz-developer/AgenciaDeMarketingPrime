import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:"new",args:["--no-sandbox"]});
const p = await b.newPage();
await p.emulateMediaFeatures([{name:"prefers-reduced-motion",value:"no-preference"}]);
p.on("pageerror", e => console.log("[pageerror]", e.message));
p.on("console", m => m.type()==="error" && console.log("[erro]", m.text()));
await p.setViewport({width:1440,height:900});
await p.goto("http://localhost:5343/", {waitUntil:"networkidle2"});
await p.evaluate(() => document.fonts.ready);
await new Promise(r=>setTimeout(r,4500));

console.log(await p.evaluate(() => ({
  reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
  coarse: matchMedia("(pointer: coarse)").matches,
  desktop: matchMedia("(min-width: 1024px)").matches,
  temServices: !!document.querySelector("[data-services]"),
  temPreview: !!document.querySelector("[data-services-preview]"),
  temRail: !!document.querySelector("[data-rail]"),
  temTrack: !!document.querySelector("[data-rail-track]"),
  nServices: document.querySelectorAll("[data-service]").length,
  scrollTriggers: window.ScrollTrigger ? "global" : "sem global",
})));

// A seção de entregas está pinada?
await p.evaluate(() => {
  const el = document.getElementById("entrega");
  window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - 200);
});
await new Promise(r=>setTimeout(r,1500));
console.log(await p.evaluate(() => {
  const t = document.querySelector("[data-rail-track]");
  const sec = document.getElementById("entrega");
  return {
    pinSpacer: !!sec.parentElement?.classList.contains("pin-spacer"),
    paiClasse: sec.parentElement?.className,
    trackTransform: getComputedStyle(t).transform,
    trackScrollW: t.scrollWidth,
    railClientW: t.parentElement.clientWidth,
  };
}));
await b.close();
