import { useEffect, useState } from "react";
import { getLenis } from "../lib/scroll";
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

  useEffect(() => {
    const onScroll = () => {
      const track = document.querySelector(".track");
      // Aparece perto do fim do trilho da hero, não a uma tela do topo.
      const limiar = track
        ? track.offsetHeight - window.innerHeight * 1.15
        : window.innerHeight * 0.9;
      setVisible(window.scrollY > limiar);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /* Âncora nativa não serve com scroll suavizado: quem manda é o Lenis. */
  const goTo = (event, id) => {
    event.preventDefault();
    const target = document.getElementById(id);
    if (!target) return;

    const lenis = getLenis();
    if (lenis) lenis.scrollTo(target, { offset: 0 });
    else target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <header className="nav" data-visible={visible}>
      <nav className="nav__bar" aria-label="Navegação principal">
        <a className="nav__brand" href="#topo" onClick={(e) => goTo(e, "topo")}>
          <img className="nav__logo nav__logo--light" src="/logo-nav.png" alt="" />
          <img className="nav__logo nav__logo--dark" src="/logo-mark.png" alt="" />
          <span className="sr-only">Agência Prime — ir para o topo</span>
        </a>

        <ul className="nav__links">
          {navItems.map(({ id, label }) => (
            <li key={id}>
              <a href={`#${id}`} onClick={(e) => goTo(e, id)}>
                {label}
              </a>
            </li>
          ))}
        </ul>

        <a className="nav__cta" href={`#${navCta.id}`} onClick={(e) => goTo(e, navCta.id)}>
          {navCta.label}
        </a>
      </nav>
    </header>
  );
}
