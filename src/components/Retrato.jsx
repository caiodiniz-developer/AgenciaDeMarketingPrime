import { useMemo, useRef, useState } from "react";
import { Rich, Title, Label } from "./Peca";
import { retrato, forcas, servicoPorId } from "../content/story";
import { getLenis } from "../lib/scroll";
import { prefersReducedMotion } from "../lib/media";

/**
 * RETRATO DA MARCA — a única parte do site que o leitor conduz.
 *
 * A página inteira é uma narrativa conduzida pelo scroll: o leitor avança e
 * as coisas acontecem. Isso funciona até certo ponto e depois vira televisão.
 * Aqui ele responde, e a página responde de volta — e o que ela devolve é
 * exatamente o que ele acabou de dizer, organizado numa frase.
 *
 * POR QUE NÃO É UM QUIZ COM NOTA
 * Um placar ("sua marca está 62% pronta") seria um número inventado sobre a
 * empresa de outra pessoa, dois cliques depois de a página se orgulhar de não
 * ter número inflado. A leitura devolvida aqui não afirma nada que o leitor
 * não tenha respondido: ela conta quantos pilares ele mesmo derrubou e diz
 * por qual começar.
 *
 * POR QUE AS PERGUNTAS SÃO AS CINCO FORÇAS
 * A seção anterior acabou de apresentá-las. Um questionário com critérios
 * próprios seria um enxerto; apoiado nelas, é a continuação do argumento — e
 * o leitor testa em si o que acabou de ver demonstrado nas peças.
 *
 * AVANÇO POR CLIQUE, NÃO POR SCROLL
 * De propósito, e é a razão de a seção existir. Se o scroll também
 * conduzisse isto, não haveria diferença entre responder e passar direto.
 */
export default function Retrato({ section }) {
  const { perguntas, leituras, frentePorForca, nota, refazer } = retrato;
  const [respostas, setRespostas] = useState({});
  const resultadoRef = useRef(null);

  const respondidas = perguntas.filter((q) => respostas[q.id] !== undefined);
  const completo = respondidas.length === perguntas.length;

  /* A primeira sem resposta é a que está em cena. Sem isso a seção seria
     quatro perguntas empilhadas — um formulário. */
  const atual = perguntas.find((q) => respostas[q.id] === undefined);

  const leitura = useMemo(() => {
    if (!completo) return null;
    const fracas = perguntas.filter((q) => respostas[q.id] === false);
    const base = leituras[fracas.length];
    /* A frente sugerida é a da PRIMEIRA força caída na ordem em que as
       forças são apresentadas — que é a ordem em que elas se sustentam. Sem
       pilar não há ritmo, sem ritmo não há direção. */
    const forcaAlvo = fracas.length
      ? forcas.map((f) => f.id).find((id) => fracas.some((q) => q.forca === id))
      : null;
    const frenteId = base.frente || frentePorForca[forcaAlvo];
    return {
      ...base,
      fracas: fracas.length,
      forca: forcaAlvo ? forcas.find((f) => f.id === forcaAlvo) : null,
      frente: servicoPorId(frenteId),
    };
  }, [completo, respostas, perguntas, leituras, frentePorForca]);

  const responder = (id, forte) => {
    setRespostas((r) => ({ ...r, [id]: forte }));
  };

  const irParaFrente = (event, id) => {
    event.preventDefault();
    const alvo = document.getElementById(id);
    if (!alvo) return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(alvo, { offset: 0 });
    else alvo.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const semMovimento = prefersReducedMotion();

  return (
    <div className="retrato" data-retrato data-estado={completo ? "lido" : "perguntando"}>
      <div className="retrato__texto">
        <Label>{section.label}</Label>
        <Title lines={section.title} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={section.body} />
        </p>
      </div>

      <div className="retrato__palco">
        {/* ── AS PERGUNTAS ─────────────────────────────────────────────
            Uma lista ordenada de verdade: a ordem importa e um leitor de
            tela precisa saber em qual das quatro está. */}
        <ol className="retrato__perguntas" data-retrato-perguntas>
          {perguntas.map((q, i) => {
            const resposta = respostas[q.id];
            const estado =
              resposta !== undefined ? "respondida" : atual?.id === q.id ? "ativa" : "espera";
            return (
              <li
                className="pergunta"
                key={q.id}
                data-estado={estado}
                data-pergunta={q.id}
                /* Sem movimento, todas ficam legíveis ao mesmo tempo: a
                   sequência é uma escolha de ritmo, não de conteúdo. */
                aria-current={estado === "ativa" ? "step" : undefined}
              >
                <span className="pergunta__num" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="pergunta__corpo">
                  <p className="pergunta__texto" id={`retrato-${q.id}`}>
                    {q.pergunta}
                  </p>

                  <div
                    className="pergunta__opcoes"
                    role="group"
                    aria-labelledby={`retrato-${q.id}`}
                  >
                    {q.opcoes.map((o) => {
                      const escolhida = resposta === o.forte;
                      return (
                        <button
                          className="opcao"
                          type="button"
                          key={o.texto}
                          data-escolhida={resposta !== undefined ? String(escolhida) : undefined}
                          aria-pressed={resposta !== undefined ? escolhida : undefined}
                          data-cursor="button"
                          onClick={() => responder(q.id, o.forte)}
                        >
                          <span className="opcao__marca" aria-hidden="true" />
                          <span className="opcao__texto">{o.texto}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        {/* ── A LEITURA ────────────────────────────────────────────────
            `aria-live`: quem não está olhando para a tela precisa receber o
            resultado, e ele aparece sem mudar de página. */}
        <div
          className="retrato__leitura"
          data-retrato-leitura
          ref={resultadoRef}
          aria-live="polite"
        >
          {leitura && (
            <>
              <h3 className="leitura__titulo">{leitura.titulo}</h3>
              <p className="leitura__texto">
                {leitura.texto}
                {leitura.forca && (
                  <>
                    {" "}
                    <span className="leitura__forca">{leitura.forca.rotulo}</span>
                    {" — "}
                    {leitura.forca.titulo.toLowerCase()}.
                  </>
                )}
              </p>

              {leitura.frente && (
                <a
                  className="leitura__frente"
                  href={`#${leitura.frente.id}`}
                  onClick={(e) => irParaFrente(e, leitura.frente.id)}
                  data-cursor="view"
                  data-cursor-text="Ver"
                >
                  <span className="leitura__frente-num" aria-hidden="true">
                    {leitura.frente.numero}
                  </span>
                  <span className="leitura__frente-nome">{leitura.frente.nome}</span>
                  <span className="leitura__frente-linha">{leitura.frente.linha}</span>
                </a>
              )}

              <p className="leitura__nota">{nota}</p>

              <button
                className="leitura__refazer"
                type="button"
                data-cursor="button"
                onClick={() => setRespostas({})}
              >
                {refazer}
              </button>
            </>
          )}
        </div>

        {/* Régua de progresso: quatro traços, um por pergunta. Não é barra de
            carregamento — é o leitor vendo quanto falta do que ELE controla. */}
        <p className="retrato__regua" aria-hidden="true" data-oculto={completo ? "sim" : undefined}>
          {perguntas.map((q) => (
            <span
              className="retrato__traco"
              key={q.id}
              data-feito={respostas[q.id] !== undefined ? "sim" : undefined}
            />
          ))}
        </p>

        <p className="sr-only">
          {completo
            ? `Leitura pronta: ${leitura?.titulo}`
            : `Pergunta ${respondidas.length + 1} de ${perguntas.length}.`}
        </p>
      </div>

      {semMovimento ? null : <span className="retrato__brilho" aria-hidden="true" />}
    </div>
  );
}
