import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "../lib/gsap";
import { getLenis } from "../lib/scroll";
import { navItems, CONTATO } from "../content/story";
import { prefersReducedMotion } from "../lib/media";

/**
 * Rodapé revelado por baixo: ele fica fixo na base, e o conteúdo — que tem
 * fundo opaco — desliza para cima descobrindo-o. Não é o rodapé que entra,
 * é a página que sai da frente. O espaçador logo abaixo do conteúdo é o que
 * dá curso de scroll para isso acontecer; a altura vem medida do próprio
 * rodapé, então mudar o conteúdo dele não quebra o efeito.
 *
 * UM BLOCO SÓ
 * A marca ficava numa faixa isolada, com os links e o e-mail numa segunda
 * faixa abaixo — duas composições disputando o mesmo fecho, e um vazio entre
 * elas. Agora é um bloco: a marca à esquerda, navegação e contato à direita,
 * na mesma linha de base. O encerramento é uma imagem só.
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

  useEffect(() => {
    const rodape = el.current;
    if (!rodape || prefersReducedMotion()) return;

    const marca = rodape.querySelector("[data-rodape-marca]");
    const brilho = rodape.querySelector("[data-rodape-brilho]");
    if (!marca) return;

    /* O gatilho é o ESPAÇADOR, não o rodapé: o rodapé está `fixed` na base e
       nunca se move, então a posição dele não conta progresso nenhum. Quem
       atravessa a tela é o curso de scroll que o descobre. */
    const espacador = document.querySelector(".footer-spacer");
    if (!espacador) return;

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: espacador,
        start: "top bottom",
        end: "bottom bottom",
        scrub: 0.7,
      },
    });

    tl.fromTo(
      marca,
      { scale: 0.86, autoAlpha: 0, yPercent: 8 },
      { scale: 1, autoAlpha: 1, yPercent: 0, ease: "none" },
      0
    );

    if (brilho) {
      tl.fromTo(brilho, { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, ease: "none" }, 0);
    }

    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      ScrollTrigger.refresh();
    };
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
      <span className="footer__brilho" data-rodape-brilho aria-hidden="true" />

      <div className="footer__inner">
        {/* A marca é o grande elemento do encerramento — mas divide a linha
            com o que o leitor pode FAZER agora. Sozinha numa faixa, ela era
            um pôster no meio do caminho. */}
        <div className="footer__marca">
          <img
            className="footer__wordmark"
            data-rodape-marca
            src="/logo-footer.png"
            alt="Agência Prime"
          />
        </div>

        <div className="footer__colunas">
          <nav className="footer__nav" aria-label="Rodapé">
            <h2 className="footer__titulo">Navegar</h2>
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

          <div className="footer__contato">
            <h2 className="footer__titulo">Falar com a Prime</h2>
            <a
              className="footer__zap"
              href={CONTATO.whatsapp.link}
              target="_blank"
              rel="noreferrer noopener"
              data-cursor="link"
            >
              {CONTATO.whatsapp.exibicao}
            </a>
            <a className="footer__mail" href={`mailto:${CONTATO.email}`} data-cursor="link">
              {CONTATO.email}
            </a>
          </div>
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
