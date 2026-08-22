import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap";
import { getLenis } from "../lib/scroll";
import { EASE, DUR, STAGGER } from "../lib/motion";
import { prefersReducedMotion } from "../lib/media";
import { navItems, navCta } from "../content/story";

/**
 * Barra flutuante de vidro. Fica FORA de qualquer contêiner com transform —
 * `position: fixed` dentro de um elemento transformado deixa de ser fixo.
 *
 * Só aparece quando a sequência de abertura está terminando: durante a hero,
 * a tela pertence ao wordmark.
 *
 * O logo entra em duas versões sobrepostas e o CSS decide qual acende, a
 * partir do tema da seção que estiver passando por baixo (`data-nav-theme`).
 * Um <img> só, trocando de `src`, piscaria a cada transição.
 */
export default function NavBar() {
  const [visible, setVisible] = useState(false);
  const [encolhida, setEncolhida] = useState(false);
  const [aberto, setAberto] = useState(false);
  const painel = useRef(null);

  useEffect(() => {
    const onScroll = () => {
      const track = document.querySelector(".track");
      // Aparece perto do fim do trilho da hero, não a uma tela do topo.
      const limiar = track
        ? track.offsetHeight - window.innerHeight * 1.15
        : window.innerHeight * 0.9;
      setVisible(window.scrollY > limiar);
      // Depois de andar um pouco, a barra recolhe: menos peso na tela
      // enquanto se lê, sem sumir de vez.
      setEncolhida(window.scrollY > limiar + window.innerHeight * 0.6);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* Com o menu aberto, rolar por trás dele é desorientador. Travar pelo Lenis
     e não por `overflow: hidden` no body: com o scroll suavizado ativo, o
     overflow não segura nada. */
  useEffect(() => {
    const lenis = getLenis();
    if (aberto) lenis?.stop();
    else lenis?.start();
    return () => lenis?.start();
  }, [aberto]);

  /* Escape fecha, como em qualquer diálogo. */
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [aberto]);

  useGSAP(
    () => {
      if (!painel.current) return;
      const itens = painel.current.querySelectorAll("[data-menu-item]");

      if (prefersReducedMotion()) {
        gsap.set(itens, { autoAlpha: 1, yPercent: 0 });
        return;
      }

      if (aberto) {
        /* O painel abre por clip-path e os links sobem em cascata. Abrir por
           opacidade daria um piscar de tela inteira; a cortina tem direção. */
        gsap
          .timeline({ defaults: { ease: EASE.expo } })
          .fromTo(
            painel.current,
            { clipPath: "inset(0% 0% 100% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7 }
          )
          .fromTo(
            itens,
            { autoAlpha: 0, yPercent: 110 },
            { autoAlpha: 1, yPercent: 0, duration: 0.7, stagger: STAGGER.items },
            "-=0.42"
          );
      }
    },
    { dependencies: [aberto], scope: painel }
  );

  /* Âncora nativa não serve com scroll suavizado: quem manda é o Lenis. */
  const goTo = (event, id) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;

    setAberto(false);
    const lenis = getLenis();
    // O painel só destrava o scroll ao fechar; ir antes disso não sai do lugar.
    requestAnimationFrame(() => {
      if (lenis) lenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      <header className="nav" data-visible={visible} data-shrink={encolhida}>
        <nav className="nav__bar" aria-label="Navegação principal">
          <a className="nav__brand" href="#topo" onClick={(e) => goTo(e, "topo")} data-cursor="link">
            <img className="nav__logo nav__logo--light" src="/logo-nav.png" alt="" />
            <img className="nav__logo nav__logo--dark" src="/logo-mark.png" alt="" />
            <span className="sr-only">Agência Prime — ir para o topo</span>
          </a>

          <ul className="nav__links">
            {navItems.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`} onClick={(e) => goTo(e, id)} data-cursor="link">
                  {label}
                </a>
              </li>
            ))}
          </ul>

          <a
            className="nav__cta"
            href={`#${navCta.id}`}
            onClick={(e) => goTo(e, navCta.id)}
            data-cursor="button"
          >
            {navCta.label}
          </a>

          {/* Abaixo do breakpoint os links não cabem na barra. Sem este botão
              a navegação simplesmente deixava de existir no celular. */}
          <button
            className="nav__menu"
            type="button"
            aria-expanded={aberto}
            aria-controls="menu-mobile"
            aria-label={aberto ? "Fechar menu" : "Abrir menu"}
            onClick={() => setAberto((v) => !v)}
            data-cursor="button"
          >
            <span className="nav__traco" />
            <span className="nav__traco" />
          </button>
        </nav>
      </header>

      <div
        className="menu"
        id="menu-mobile"
        ref={painel}
        data-aberto={aberto}
        hidden={!aberto}
      >
        <nav aria-label="Navegação">
          <ul className="menu__lista">
            {navItems.map(({ id, label }, i) => (
              <li className="menu__linha" key={id}>
                <a href={`#${id}`} onClick={(e) => goTo(e, id)} data-menu-item>
                  <span className="menu__num" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="menu__rodape" data-menu-item>
          <a className="menu__cta" href={navCta.cta.href}>
            {navCta.cta.label}
          </a>
          <span className="menu__mail">{navCta.cta.href.replace("mailto:", "")}</span>
        </div>
      </div>
    </>
  );
}
