import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "../lib/gsap";
import { EASE } from "../lib/motion";
import { prefersReducedMotion } from "../lib/media";

/**
 * Pop-up do perfil do cliente, aberto sem sair do site.
 *
 * O IFRAME É REAL: aponta para `instagram.com/<perfil>/embed`, que é o
 * endereço de incorporação do próprio Instagram. Quando ele responde, o
 * visitante vê o perfil de verdade aqui dentro.
 *
 * O Instagram, porém, RECUSA ser embutido em boa parte dos casos — manda
 * `X-Frame-Options` e o navegador desenha um quadro vazio, sem avisar a
 * página. Não existe como perguntar "carregou?" a um iframe de outra origem.
 * Então o pop-up trabalha com prazo: se o quadro não der sinal de vida em
 * poucos segundos, o conteúdo da Prime assume o lugar, com o botão que leva
 * ao perfil verdadeiro.
 *
 * É o desenho honesto para uma dependência que não está sob nosso controle:
 * no melhor caso o leitor vê o Instagram sem sair daqui; no pior, ele
 * continua a um clique — e nunca encara um retângulo branco.
 */
export default function PerfilModal({ cliente, aberto, aoFechar }) {
  const fundo = useRef(null);
  const caixa = useRef(null);
  const [carregou, setCarregou] = useState(false);
  const [desistiu, setDesistiu] = useState(false);

  /* Prazo do iframe. Reinicia a cada abertura: o leitor pode abrir de novo
     numa conexão melhor. */
  useEffect(() => {
    if (!aberto) {
      setCarregou(false);
      setDesistiu(false);
      return;
    }
    const t = setTimeout(() => setDesistiu(true), 4500);
    return () => clearTimeout(t);
  }, [aberto, cliente?.id]);

  /* Escape fecha, como em qualquer diálogo. E o fundo para de rolar: rolar a
     página atrás de um modal é o defeito mais comum deste componente. */
  useEffect(() => {
    if (!aberto) return;
    const onKey = (e) => e.key === "Escape" && aoFechar();
    window.addEventListener("keydown", onKey);
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = antes;
    };
  }, [aberto, aoFechar]);

  useGSAP(
    () => {
      if (!aberto || !caixa.current || prefersReducedMotion()) return;
      gsap
        .timeline()
        .fromTo(fundo.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.35, ease: EASE.out })
        .fromTo(
          caixa.current,
          { autoAlpha: 0, y: 28, scale: 0.94 },
          { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: EASE.out },
          0.06
        );
    },
    { dependencies: [aberto, cliente?.id] }
  );

  if (!aberto || !cliente) return null;

  const mostrarReserva = desistiu && !carregou;

  return (
    <div
      className="pop"
      ref={fundo}
      role="dialog"
      aria-modal="true"
      aria-label={`Perfil de ${cliente.nome} no Instagram`}
      onClick={(e) => e.target === fundo.current && aoFechar()}
    >
      <div className="pop__caixa" ref={caixa}>
        <header className="pop__topo">
          <span className="pop__marca" data-placa={String(cliente.placa)}>
            <img src={cliente.logo} alt="" aria-hidden="true" />
          </span>
          <span className="pop__id">
            <b>{cliente.nome}</b>
            <i>{cliente.arroba}</i>
          </span>
          <button
            className="pop__fechar"
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            data-cursor="button"
          >
            ✕
          </button>
        </header>

        <div className="pop__janela" data-pronto={String(carregou)}>
          {!mostrarReserva && (
            <iframe
              className="pop__frame"
              title={`Instagram de ${cliente.nome}`}
              src={`https://www.instagram.com/${cliente.arroba.replace("@", "")}/embed/`}
              loading="lazy"
              onLoad={() => setCarregou(true)}
              /* `allow-scripts` é o que o embed do Instagram precisa para
                 desenhar; `allow-same-origin` fica de fora de propósito —
                 juntos, os dois anulam a caixa de areia. */
              sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          )}

          {!carregou && (
            <div className="pop__reserva">
              {!desistiu ? (
                <p className="pop__carregando">
                  <span className="pop__spin" aria-hidden="true" />
                  Carregando o perfil…
                </p>
              ) : (
                <>
                  <p className="pop__aviso">
                    O Instagram não permite exibir este perfil dentro de outro site.
                  </p>
                  <p className="pop__sub">
                    O conteúdo de {cliente.nome} está publicado no perfil oficial.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <footer className="pop__base">
          <a
            className="pop__link"
            href={cliente.instagram}
            target="_blank"
            rel="noreferrer noopener"
            data-cursor="button"
          >
            Abrir {cliente.arroba} no Instagram
            <span aria-hidden="true">↗</span>
          </a>
        </footer>
      </div>
    </div>
  );
}
