// Registro único dos plugins, importados um a um para não matar o tree-shaking.
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";

gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin);

export { gsap, useGSAP, ScrollTrigger, SplitText, DrawSVGPlugin };
