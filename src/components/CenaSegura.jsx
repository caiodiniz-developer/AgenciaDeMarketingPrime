import { Component } from "react";

/**
 * Cerca em volta da cena 3D.
 *
 * O notebook é enfeite: ele conduz o olhar, mas nenhuma informação do site
 * depende dele. Sem esta cerca, porém, ele tinha poder de veto sobre a página
 * inteira — quando o `.glb` foi renomeado no disco, o loader lançou durante o
 * render e o React derrubou a árvore toda: tela preta, zero seções, zero
 * texto. Um arquivo de 1,8 MB que pode faltar por qualquer motivo (rede ruim,
 * cache podre, GPU sem WebGL) não pode levar o conteúdo junto.
 *
 * Falhou: some em silêncio e o site segue em pé, sem o objeto. É exatamente o
 * que já acontece nas seções em que ele se ausenta de propósito.
 */
export default class CenaSegura extends Component {
  state = { caiu: false };

  static getDerivedStateFromError() {
    return { caiu: true };
  }

  componentDidCatch(erro) {
    /* Silencioso para o leitor, ruidoso para quem estiver com o console
       aberto: um modelo que não carrega é defeito, não é comportamento. */
    console.error("[cena 3D] desligada:", erro);
  }

  render() {
    return this.state.caiu ? null : this.props.children;
  }
}
