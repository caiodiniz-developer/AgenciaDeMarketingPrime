import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "lenis/dist/lenis.css";
import "./index.css";

import { initSmoothScroll } from "./lib/scroll";
import App from "./App";

// Antes do primeiro render: efeitos de filho rodam antes dos do pai, e
// qualquer trava de scroll pedida lá em baixo precisa achar a instância pronta.
initSmoothScroll();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
