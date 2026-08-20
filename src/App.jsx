import NavBar from "./components/NavBar";
import ScrollStage from "./components/ScrollStage";
import Story from "./components/Story";

/**
 * A sequência dirigida pelo scroll é a experiência principal e vive isolada
 * no ScrollStage. As seções seguintes vêm depois do trilho, em fluxo normal —
 * acrescentar uma é acrescentar um objeto em src/content/story.js.
 *
 * A NavBar fica FORA de tudo: `position: fixed` dentro de um elemento
 * transformado deixa de ser fixo.
 */
export default function App() {
  return (
    <>
      <NavBar />
      <main>
        <ScrollStage />
        <Story />
      </main>
    </>
  );
}
