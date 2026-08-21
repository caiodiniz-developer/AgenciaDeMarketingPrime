import { useEffect, useRef, useState } from "react";
import { gsap } from "../lib/gsap";
import { pointer, damp, isTouch } from "../lib/pointer";
import { prefersReducedMotion } from "../lib/media";

/**
 * Cursor customizado: um ponto que cola no ponteiro e um anel que chega
 * atrasado. O atraso é o efeito — os dois juntos seriam só um cursor maior.
 *
 * Estados vêm do DOM, por `data-cursor`, em vez de contexto do React: assim
 * qualquer elemento entra no sistema sem precisar conhecê-lo, e a leitura
 * acontece em delegação, sem um listener por elemento.
 *
 * Não existe em toque nem em reduced-motion. O cursor nativo continua vivo por
 * baixo o tempo todo — isto é enfeite, não substituto.
 */
export default function Cursor() {
  const dot = useRef(null);
  const ring = useRef(null);
  const label = useRef(null);
  const [enabled] = useState(() => !isTouch() && !prefersReducedMotion());
  const [state, setState] = useState("default");
  const [text, setText] = useState("");

  useEffect(() => {
    if (!enabled) return;

    const d = dot.current;
    const r = ring.current;

    // Começa fora da tela: sem isto, o cursor nasce no canto e escorrega até o mouse.
    let rx = -100;
    let ry = -100;
    gsap.set([d, r], { x: -100, y: -100 });

    const setDX = gsap.quickSetter(d, "x", "px");
    const setDY = gsap.quickSetter(d, "y", "px");
    const setRX = gsap.quickSetter(r, "x", "px");
    const setRY = gsap.quickSetter(r, "y", "px");

    const tick = (_t, dt) => {
      if (!pointer.active) return;
      const s = dt / 1000;

      setDX(pointer.x);
      setDY(pointer.y);

      rx = damp(rx, pointer.x, 0.18, s);
      ry = damp(ry, pointer.y, 0.18, s);
      setRX(rx);
      setRY(ry);
    };

    gsap.ticker.add(tick);

    /* Delegação: um par de listeners para a página inteira. */
    const onOver = (e) => {
      const alvo = e.target.closest?.("[data-cursor]");
      if (!alvo) return;
      setState(alvo.dataset.cursor || "link");
      setText(alvo.dataset.cursorText || "");
    };
    const onOut = (e) => {
      if (e.target.closest?.("[data-cursor]") && !e.relatedTarget?.closest?.("[data-cursor]")) {
        setState("default");
        setText("");
      }
    };
    const onDown = () => setState((s) => (s === "default" ? "press" : s));
    const onUp = () => setState((s) => (s === "press" ? "default" : s));

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);

    document.documentElement.setAttribute("data-has-cursor", "true");

    return () => {
      gsap.ticker.remove(tick);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
      document.documentElement.removeAttribute("data-has-cursor");
    };
  }, [enabled]);

  useEffect(() => {
    if (label.current) label.current.textContent = text;
  }, [text]);

  if (!enabled) return null;

  return (
    <div className="cursor" data-state={state} aria-hidden="true">
      <span className="cursor__dot" ref={dot} />
      <span className="cursor__ring" ref={ring}>
        <span className="cursor__label" ref={label} />
      </span>
    </div>
  );
}
