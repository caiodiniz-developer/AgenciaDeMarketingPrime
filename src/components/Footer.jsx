import { useEffect, useRef } from "react";
import { getLenis } from "../lib/scroll";
import { navItems, navCta } from "../content/story";

/**
 * Rodapé revelado por baixo: ele fica fixo na base, e o conteúdo — que tem
 * fundo opaco — desliza para cima descobrindo-o. Não é o rodapé que entra,
 * é a página que sai da frente.
 *
 * O espaçador logo abaixo do conteúdo é o que dá curso de scroll para isso
 * acontecer; a altura vem medida do próprio rodapé, então mudar o conteúdo
 * dele não quebra o efeito.
 */
export default function Footer() {
  const el = useRef(null);

  useEffect(() => {
    const rodape = el.current;
    if (!rodape) return;

    const medir = () => {
      document.documentElement.style.setProperty("--footer-h", `${rodape.offsetHeight}px`);
    };

    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(rodape);
    return () => ro.disconnect();
  }, []);

  const irPara = (event, id) => {
    event.preventDefault();
    const alvo = document.getElementById(id);
    if (!alvo) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(alvo, { offset: 0 });
    else alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <footer className="footer" ref={el}>
      <div className="footer__inner">
        <div className="footer__brand">
          <img src="/logo-nav.png" alt="Agência Prime" className="footer__logo" />
          <p className="footer__claim">Onde ideias se tornam presença.</p>
        </div>

        <nav className="footer__nav" aria-label="Rodapé">
          <ul>
            {navItems.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`} onClick={(e) => irPara(e, id)} data-cursor="link">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="footer__contact">
          <a className="footer__mail" href={navCta.cta.href} data-cursor="link">
            {navCta.cta.href.replace("mailto:", "")}
          </a>
        </div>
      </div>

      <div className="footer__base">
        <span>© {new Date().getFullYear()} Agência Prime</span>
        <a href="#topo" onClick={(e) => irPara(e, "topo")} data-cursor="link">
          Voltar ao topo ↑
        </a>
      </div>
    </footer>
  );
}
