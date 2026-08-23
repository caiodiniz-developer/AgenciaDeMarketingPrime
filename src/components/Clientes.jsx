import { useState } from "react";
import { Rich, Title, Label } from "./Peca";
import { clientes } from "../content/story";
import PerfilModal from "./PerfilModal";

/**
 * QUEM CONFIA — duas marcas, lado a lado, e nada mais.
 *
 * A versão anterior empilhava logo, nome, ficha e uma grade de marcas d'água
 * fingindo ser posts. Era muito elemento para pouca informação, e a grade
 * inventada não convencia ninguém. Agora a seção diz exatamente o que tem:
 * duas marcas reais, grandes, uma ao lado da outra.
 *
 * O CONTEÚDO fica onde ele existe de verdade. Apontar uma marca abre o perfil
 * dela num pop-up — o Instagram real, dentro do site — e quem quiser ir até lá
 * tem o botão. Ver o trabalho do cliente sem sair da página é a prova; uma
 * miniatura desenhada por mim não seria.
 */
export default function Clientes({ section }) {
  const [ativo, setAtivo] = useState(null);

  return (
    <div className="quem" data-quem data-total={clientes.length}>
      <header className="quem__cabeca">
        <Label>{section.label}</Label>
        <Title lines={section.title} id={section.id} />
        <p className="sec__body" data-sec-body>
          <Rich parts={section.body} />
        </p>
      </header>

      <ul className="quem__marcas" data-quem-marcas>
        {clientes.map((c, i) => (
          <li className="marca" data-marca={c.id} data-indice={i} data-sec-item key={c.id}>
            <button
              className="marca__gatilho"
              type="button"
              onClick={() => setAtivo(c)}
              /* Passar o mouse já abre — foi o pedido — mas o clique continua
                 valendo, e é ele que serve no toque e no teclado, onde
                 "passar o mouse" não existe. */
              onPointerEnter={(e) => e.pointerType === "mouse" && setAtivo(c)}
              onFocus={() => setAtivo(c)}
              data-cursor="view"
              data-cursor-text="Ver"
              aria-label={`Ver o perfil de ${c.nome} no Instagram`}
            >
              <span className="marca__placa" data-placa={String(c.placa)}>
                <img src={c.logo} alt={c.nome} loading="lazy" />
              </span>
              <span className="marca__pe">
                <span className="marca__nome">{c.nome}</span>
                <span className="marca__arroba">{c.arroba}</span>
              </span>
              <span className="marca__risco" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>

      <p className="quem__dica" data-quem-dica>
        <span className="quem__dica-toque">Toque em uma marca para ver o perfil</span>
        <span className="quem__dica-mouse">Aponte para uma marca para ver o perfil</span>
      </p>

      <PerfilModal cliente={ativo} aberto={Boolean(ativo)} aoFechar={() => setAtivo(null)} />
    </div>
  );
}
