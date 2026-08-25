// Registro único dos plugins, importados um a um para não matar o tree-shaking.
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { Flip } from "gsap/Flip";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin, Flip, MotionPathPlugin);

/* Exposto para o harness de verificação: sem uma porta para os gatilhos,
   diagnosticar posição de ScrollTrigger vira leitura de código em vez de
   medição. */
if (typeof window !== "undefined") window.ScrollTrigger = ScrollTrigger;

export { gsap, useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin, Flip, MotionPathPlugin };
