import NavBar from "./components/NavBar";
import ScrollStage from "./components/ScrollStage";
import Story from "./components/Story";
import Footer from "./components/Footer";
import Cursor from "./components/Cursor";
import AmbientLight from "./components/AmbientLight";
import ScrollProgress from "./components/ScrollProgress";
import Preloader from "./components/Preloader";

/**
 * A sequência dirigida pelo scroll é a experiência principal e vive isolada
 * no ScrollStage. As seções seguintes vêm depois do trilho, em fluxo normal —
 * acrescentar uma é acrescentar um objeto em src/content/story.js.
 *
 * Ordem das camadas fixas: luz de ambiente lá atrás, conteúdo, e só então
 * barra, progresso, cursor e abertura. Tudo que é `position: fixed` fica FORA
 * do conteúdo: dentro de um elemento transformado, `fixed` deixa de ser fixo.
 *
 * `.shell` tem fundo opaco e desliza por cima do rodapé, que está fixo na
 * base. Não é o rodapé que entra — é a página que sai da frente.
 */
export default function App() {
  return (
    <>
      <AmbientLight />

      <div className="shell">
        <main>
          <ScrollStage />
          <Story />
        </main>
      </div>

      <Footer />
      {/* Curso de scroll para o rodapé aparecer por baixo do conteúdo. */}
      <div className="footer-spacer" aria-hidden="true" />

      <NavBar />
      <ScrollProgress />
      <Cursor />
      <Preloader />
    </>
  );
}
