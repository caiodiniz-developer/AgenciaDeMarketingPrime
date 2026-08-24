import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Environment } from "@react-three/drei";
import * as THREE from "three";
import { cena, FORA, CANAIS } from "../lib/progress";
import { prefersReducedMotion } from "../lib/media";
import { pointer, damp, isTouch } from "../lib/pointer";

const MODEL = "/laptop.glb";
useGLTF.preload(MODEL);

/**
 * Orientação de repouso do modelo.
 *
 * O arquivo vem do Sketchfab deitado: o conjunto da tampa é um plano
 * horizontal e o do teclado, um plano vertical. Estes dois giros põem o
 * objeto de pé — teclado para cima, tela encarando a câmera.
 *
 * Os valores estão aqui em cima, e não enterrados no meio da montagem, porque
 * são a única coisa deste arquivo que depende do .glb: trocar o modelo é
 * mexer nestas duas linhas.
 */
const ROT_BASE = [-Math.PI / 2, 0, 0];

/** Material do painel da tela no arquivo original. É ele que vira vídeo. */
const MATERIAL_DA_TELA = "aiStandardSurface7SG";

/**
 * Sondagem do modelo.
 *
 * Nenhuma dessas duas constantes acima é dedutível do arquivo com segurança:
 * o .glb vem do Sketchfab sem convenção de nomes, com todos os nós chamados
 * `Object_N` e um atlas de textura compartilhado. Descobrir qual malha é a
 * tela e para que lado o objeto está virado é trabalho de OLHAR.
 *
 * Com `?laptop=debug` na URL, cada malha recebe uma cor sólida e um relatório
 * vai para `window.__laptop`. Com `?rot=x,y,z` (em graus) dá para experimentar
 * orientações sem reconstruir. Custa nada em produção — o parâmetro não
 * existe — e evita a alternativa, que é chutar rotação até acertar.
 */
const parametro = (nome) => {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get(nome);
};

/**
 * Quanto a tampa gira ao fechar, em radianos.
 *
 * Não é π/2. Fechada de verdade, a tampa encosta na base e o objeto vira um
 * bloco sem leitura — e, pior, as duas metades se interpenetram, porque a
 * dobradiça deduzida da geometria não é exatamente a do fabricante. Parar
 * pouco antes preserva o gesto e a silhueta.
 */
const FECHAMENTO = Math.PI * 0.44;

const PALETA = [
  "#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4",
  "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff",
];

/* ── A tela ────────────────────────────────────────────────────────────────
   Duas texturas de vídeo e um `mix`: trocar de canal é uma travessia, nunca
   um corte. Sem shader teria de haver dois planos sobrepostos disputando o
   mesmo z — e z-fighting numa superfície plana é exatamente o artefato que
   denuncia a cena montada às pressas. */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform sampler2D uA;
  uniform sampler2D uB;
  uniform float uMix;
  uniform float uLigada;
  uniform float uPresenca;
  varying vec2 vUv;

  void main() {
    vec3 a = texture2D(uA, vUv).rgb;
    vec3 b = texture2D(uB, vUv).rgb;
    vec3 cor = mix(a, b, uMix);

    /* Vinheta curtíssima nas bordas: um painel de LED nunca é uniforme até o
       último pixel, e sem isso a tela lê como adesivo colado na tampa. */
    vec2 d = abs(vUv - 0.5) * 2.0;
    float borda = 1.0 - smoothstep(0.86, 1.0, max(d.x, d.y)) * 0.35;

    /* A tela acende: escura enquanto o objeto está fora de cena, cheia
       quando ele é o assunto. Ligar de uma vez faria o notebook piscar ao
       entrar no quadro. */
    /* A presença some com o objeto inteiro. Uma tela acesa sobre um chassi
       já apagado é o artefato clássico de quem esqueceu um material fora do
       fade. */
    gl_FragColor = vec4(cor * borda * uLigada, uPresenca);
  }
`;

/** Um <video> mudo, em loop, pronto para virar textura. */
function criarVideo(src) {
  const v = document.createElement("video");
  v.src = src;
  v.crossOrigin = "anonymous";
  v.loop = true;
  v.muted = true;
  v.defaultMuted = true;
  v.playsInline = true;
  v.setAttribute("muted", "");
  v.setAttribute("playsinline", "");
  v.preload = "auto";
  return v;
}

function criarTextura(video) {
  const t = new THREE.VideoTexture(video);
  t.colorSpace = THREE.SRGBColorSpace;
  t.minFilter = THREE.LinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

/**
 * UVs planares refeitas a partir da própria caixa do painel.
 *
 * As UVs originais apontam para uma região arbitrária do atlas do modelo —
 * aplicar vídeo nelas mostraria um recorte torto de um canto do quadro. Como
 * o painel é plano, dá para projetar: descobre-se em que eixo ele é fino e
 * mapeiam-se os outros dois para 0..1.
 */
function projetarUV(geometria) {
  geometria.computeBoundingBox();
  const bb = geometria.boundingBox;
  const tam = new THREE.Vector3().subVectors(bb.max, bb.min);

  // O eixo mais curto é a espessura; os outros dois são a superfície.
  const eixos = [0, 1, 2].sort((a, b) => tam.getComponent(a) - tam.getComponent(b));
  const [, eu, ev] = eixos;

  const pos = geometria.attributes.position;
  const uv = new Float32Array(pos.count * 2);
  const minU = bb.min.getComponent(eu);
  const minV = bb.min.getComponent(ev);
  const spanU = tam.getComponent(eu) || 1;
  const spanV = tam.getComponent(ev) || 1;

  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getComponent(i, eu) - minU) / spanU;
    const v = (pos.getComponent(i, ev) - minV) / spanV;
    uv[i * 2] = u;
    /* O vídeo é escrito de cima para baixo e a UV cresce para cima: sem a
       inversão, a tela mostra o mundo de cabeça para baixo. */
    uv[i * 2 + 1] = 1 - v;
  }

  geometria.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return { bb, tam };
}

function Laptop({ luzOuro, sonda }) {
  const { scene } = useGLTF(MODEL);
  const grupo = useRef(null);
  const { viewport, size } = useThree();
  const parado = prefersReducedMotion();
  const semPonteiro = parado || isTouch();

  /* ── Vídeos e shader da tela ─────────────────────────────────────────
     Dois elementos, e não um com troca de `src`: trocar a fonte de um vídeo
     em uso zera a textura por alguns quadros, e o crossfade viraria um
     flash preto no meio do movimento. */
  const tela = useMemo(() => {
    const canais = Object.keys(CANAIS);
    const inicial = CANAIS[cena.canal] || CANAIS[canais[0]];
    const vA = criarVideo(inicial);
    const vB = criarVideo(inicial);
    const uniforms = {
      uA: { value: criarTextura(vA) },
      uB: { value: criarTextura(vB) },
      uMix: { value: 0 },
      uLigada: { value: 0.25 },
      uPresenca: { value: 1 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      /* Todos os materiais deste arquivo são `doubleSided`, e o painel da tela
         é modelado com a normal para DENTRO da tampa. Com o padrão FrontSide o
         renderizador descartava justamente a face virada para a câmera — via-se
         através dela o forro escuro do fundo, e a tela parecia apagada. */
      side: THREE.DoubleSide,
      transparent: true,
      toneMapped: false,
    });
    const estado = { vA, vB, uniforms, material, atual: cena.canal, usandoA: true };

    /* Sonda de diagnóstico. A tela é a peça mais opaca do site: se ela
       aparecer preta, a causa pode ser o vídeo, a textura, a UV, a face
       descartada ou o uniforme — e nenhuma delas se distingue olhando. */
    if (parametro("laptop") === "debug") {
      window.__tela = () => ({
        src: vA.currentSrc,
        prontoA: vA.readyState,
        prontoB: vB.readyState,
        tempoA: +vA.currentTime.toFixed(2),
        pausadoA: vA.paused,
        erroA: vA.error?.message || null,
        ligada: +uniforms.uLigada.value.toFixed(2),
        mix: +uniforms.uMix.value.toFixed(2),
      });
    }

    return estado;
  }, []);

  /* ── Modelo normalizado ──────────────────────────────────────────────
     O arquivo vem em escala e centro arbitrários. Normalizar uma vez deixa
     as poses do conteúdo em números legíveis (-1 a 1 na tela). */
  const { modelo, telaLocal, pivo, materiais } = useMemo(() => {
    const raiz = new THREE.Group();
    const clone = scene.clone(true);

    /* A orientação é aplicada em um nó INTERMEDIÁRIO, antes de medir: assim
       a caixa medida já é a do objeto de pé, e as poses do conteúdo falam
       da silhueta que o leitor vê, não da que veio do arquivo. */
    /* O exportador do Sketchfab grava uma rotação de conversão Z-up→Y-up no
       nó raiz. Ela CANCELAVA a orientação pedida aqui — o objeto aparecia
       mostrando a base por baixo, e girar o valor não mudava nada, porque as
       duas rotações se somavam a zero. Zerada, `ROT_BASE` volta a falar do
       espaço em que as coordenadas do arquivo foram escritas. */
    clone.traverse((no) => {
      if (no.name === "Sketchfab_model") no.quaternion.identity();
    });

    const giro = parametro("rot");
    const rot = giro
      ? giro.split(",").map((g) => (Number(g) * Math.PI) / 180)
      : ROT_BASE;
    clone.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    clone.updateMatrixWorld(true);

    const debug = parametro("laptop") === "debug";
    const alvoTela = parametro("tela") || MATERIAL_DA_TELA;
    const relatorio = [];
    const materiais = [];
    let painel = null;
    let n = 0;

    clone.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;

      if (debug) {
        const cx = new THREE.Box3().setFromObject(child);
        const t = cx.getSize(new THREE.Vector3());
        relatorio.push({
          i: n,
          malha: child.geometry?.name || child.name,
          material: child.material?.name,
          cor: PALETA[n % PALETA.length],
          tamanho: [+t.x.toFixed(2), +t.y.toFixed(2), +t.z.toFixed(2)],
          centro: cx.getCenter(new THREE.Vector3()).toArray().map((v) => +v.toFixed(2)),
        });
        child.material = new THREE.MeshBasicMaterial({
          color: PALETA[n % PALETA.length],
          side: THREE.DoubleSide,
        });
        n += 1;
        return;
      }
      n += 1;

      const nome = child.material?.name;
      if (nome === alvoTela && !painel) {
        painel = child;
        return;
      }

      if (child.material) {
        child.material = child.material.clone();
        /* `transparent` desde já, e não ligado no meio do fade: trocar o modo
           de blend de um material em uso força a recompilação do shader — e o
           objeto pisca exatamente no quadro em que deveria começar a sumir. */
        child.material.transparent = true;
        materiais.push(child.material);
        child.material.envMapIntensity = 0.85;
        if (child.material.metalness !== undefined) {
          // O alumínio original vem claro demais para uma página preta.
          child.material.metalness = Math.min(1, (child.material.metalness || 0.4) + 0.28);
          child.material.roughness = Math.max(0.16, (child.material.roughness ?? 0.5) - 0.12);
        }
      }
    });

    let caixaTela = null;
    if (painel) {
      painel.geometry = painel.geometry.clone();
      projetarUV(painel.geometry);
      painel.material = tela.material;
      painel.renderOrder = 2;
      caixaTela = new THREE.Box3().setFromObject(painel);
    }

    /* ── A TAMPA GANHA DOBRADIÇA ──────────────────────────────────────
       O arquivo não tem hierarquia: todos os nós são irmãos chamados
       `Object_N`, sem tampa nem base agrupadas. Mas a GEOMETRIA separa as
       duas metades sem ambiguidade — depois de pôr o objeto de pé, tudo que
       pertence à tampa está acima da linha da dobradiça, e tudo que pertence
       à base, colado no chão.
       Então as malhas altas são reparentadas para um pivô posicionado na
       dobradiça, e fechar vira uma rotação em X desse pivô. Nada da malha é
       alterado: só muda de pai. */
    const pivo = new THREE.Group();
    const caixaGeral = new THREE.Box3().setFromObject(clone);
    const alturaTotal = caixaGeral.max.y - caixaGeral.min.y;
    // A dobradiça: um pouco acima do chão, no fundo da base.
    const linhaDobra = caixaGeral.min.y + alturaTotal * 0.09;

    const daTampa = [];
    clone.traverse((child) => {
      if (!child.isMesh) return;
      const c = new THREE.Box3().setFromObject(child).getCenter(new THREE.Vector3());
      if (c.y > linhaDobra + alturaTotal * 0.18) daTampa.push({ malha: child, centro: c });
    });

    if (daTampa.length) {
      const zDobra = Math.max(...daTampa.map((t) => new THREE.Box3().setFromObject(t.malha).max.z));
      clone.add(pivo);
      /* `linhaDobra` e `zDobra` vieram de uma caixa em coordenadas de MUNDO,
         mas `position` de um filho fala o espaço LOCAL do pai — e `clone`
         carrega a rotação que põe o objeto de pé. Escrever o ponto direto
         punha a dobradiça num canto qualquer do modelo, e a tampa girava em
         torno de um eixo que não é o dela. O eixo de rotação, esse, continua
         valendo: um giro em X sobrevive a uma rotação em X. */
      pivo.position.copy(clone.worldToLocal(new THREE.Vector3(0, linhaDobra, zDobra)));
      /* `attach` preserva a posição no MUNDO ao trocar de pai — com `add`
         cada peça saltaria para as coordenadas locais do pivô e a tampa se
         desmontaria antes de qualquer animação. */
      daTampa.forEach((t) => pivo.attach(t.malha));
    }

    if (debug && typeof window !== "undefined") {
      window.__laptop = relatorio;
      window.__tampa = () => ({ pecas: daTampa.length, dobra: +linhaDobra.toFixed(2) });
    }

    const box = new THREE.Box3().setFromObject(clone);
    const tam = box.getSize(new THREE.Vector3());
    const centro = box.getCenter(new THREE.Vector3());
    const unidade = 1 / Math.max(tam.x, tam.y, tam.z);

    /* A ordem importa: `position` vive no espaço do PAI e não é afetada pela
       escala do próprio objeto. Subtrair o centro em unidades originais e só
       então encolher jogaria o modelo para longe do pivô. */
    clone.scale.setScalar(unidade);
    clone.position.copy(centro).multiplyScalar(-unidade);
    raiz.add(clone);

    /* Onde a tela está DENTRO do grupo normalizado. É o que permite a
       câmera entrar nela sem depender de medida de layout. */
    const local = caixaTela
      ? {
          centro: caixaTela
            .getCenter(new THREE.Vector3())
            .sub(centro)
            .multiplyScalar(unidade),
          altura: caixaTela.getSize(new THREE.Vector3()).y * unidade,
          largura: caixaTela.getSize(new THREE.Vector3()).x * unidade,
        }
      : { centro: new THREE.Vector3(), altura: 0.5, largura: 0.8 };

    return { modelo: raiz, telaLocal: local, pivo: daTampa.length ? pivo : null, materiais };
  }, [scene, tela]);

  /* Play só quando a cena está viva: vídeo decodificando fora de tela é
     bateria queimada de graça. */
  useEffect(() => {
    const tocar = () => {
      tela.vA.play().catch(() => {});
      tela.vB.play().catch(() => {});
    };
    tocar();
    return () => {
      tela.vA.pause();
      tela.vB.pause();
    };
  }, [tela]);

  const atual = useRef({ ...FORA });
  const suave = useRef({ zoom: 0, rx: 0, ry: 0, ligada: 0.25, presenca: 0, tampa: 0 });
  const trocando = useRef(false);

  /** Troca de canal: carrega no vídeo ocioso e atravessa quando ele estiver pronto. */
  const trocarCanal = (canal) => {
    const src = CANAIS[canal];
    if (!src || trocando.current) return;
    trocando.current = true;
    tela.atual = canal;

    const entra = tela.usandoA ? tela.vB : tela.vA;
    const destino = tela.usandoA ? 1 : 0;

    const seguir = () => {
      entra.removeEventListener("loadeddata", seguir);
      entra.play().catch(() => {});
      tela.alvoMix = destino;
      tela.usandoA = !tela.usandoA;
      trocando.current = false;
    };

    if (entra.src.endsWith(src)) {
      seguir();
      return;
    }
    entra.addEventListener("loadeddata", seguir);
    entra.src = src;
    entra.load();
  };

  useFrame((_estado, delta) => {
    const g = grupo.current;
    if (!g) return;

    const dt = Math.min(delta, 0.05);
    const alvo = cena.pose || FORA;
    const c = atual.current;
    const s = suave.current;

    /* Persegue a pose em vez de saltar: o alvo é do scroll, o movimento é do
       relógio. É o mesmo princípio do scrub do vídeo da hero — e é o que dá
       peso ao objeto. */
    const l = parado ? 0.5 : 0.13;
    c.x = damp(c.x, alvo.x, l, dt);
    c.y = damp(c.y, alvo.y, l, dt);
    c.scale = damp(c.scale, alvo.scale, l, dt);
    c.rotY = damp(c.rotY, alvo.rotY, l, dt);
    c.rotX = damp(c.rotX, alvo.rotX, l, dt);
    s.zoom = damp(s.zoom, cena.zoom || 0, 0.16, dt);

    /* PRESENÇA. Sai de cena apagando, não saltando — e a pose continua
       correndo por baixo, de modo que ao reacender ele já está no ponto
       certo do trajeto em vez de aparecer onde parou. */
    /* O produto é feito AQUI, a cada quadro: a seção diz se o objeto
       pertence à cena e a rampa diz se ele já existe. Multiplicado dentro do
       callback do gatilho, o resultado congelava no valor que a rampa tinha
       no instante da virada. */
    const alvoPresenca = (cena.presente ?? 1) * (cena.nascido ?? 1);
    cena.presenca = alvoPresenca;
    s.presenca = damp(s.presenca, alvoPresenca, 0.07, dt);
    const p = s.presenca;
    if (Math.abs(p - (tela.presencaAplicada ?? -1)) > 0.004) {
      tela.presencaAplicada = p;
      tela.uniforms.uPresenca.value = p;
      for (let i = 0; i < materiais.length; i++) materiais[i].opacity = p;
    }
    /* Abaixo do limiar não há o que desenhar: pular o resto do quadro poupa
       a matriz, a projeção e — o que pesa — o preenchimento do canvas. */
    g.visible = p > 0.012;
    if (!g.visible) return;

    /* A TAMPA. Fecha em X sobre a dobradiça; nunca chega a encostar, porque
       tampa encostada é um objeto que sumiu, e o que se quer ver é o gesto. */
    if (pivo) {
      s.tampa = damp(s.tampa, cena.tampa || 0, 0.09, dt);
      pivo.rotation.x = s.tampa * FECHAMENTO;
    }

    /* Parallax de ponteiro: poucos graus, sempre interpolados. Colar a
       rotação no cursor faz o objeto parecer brinquedo em vez de coisa com
       massa. */
    if (!semPonteiro && pointer.active) {
      s.ry = damp(s.ry, pointer.nx * 0.055, 0.06, dt);
      s.rx = damp(s.rx, pointer.ny * -0.036, 0.06, dt);
    } else {
      s.ry = damp(s.ry, 0, 0.06, dt);
      s.rx = damp(s.rx, 0, 0.06, dt);
    }

    /* A tela acende conforme o objeto se aproxima e conforme entra no
       quadro. Fora de cena ela é um brilho fraco, não um retângulo aceso
       viajando pela borda da janela. E apaga junto com a tampa: um painel
       aceso visível através de uma tampa fechada não existe. */
    const dentro = 1 - Math.min(1, Math.max(0, (Math.abs(c.x) - 0.85) / 0.8));
    s.ligada = damp(s.ligada, (0.3 + dentro * 0.7) * (1 - s.tampa * 0.9), 0.08, dt);
    tela.uniforms.uLigada.value = s.ligada;

    /* O REFLEXO DOURADO. A luz de contorno gira devagar em volta do objeto,
       conduzida pelo scroll: o brilho corre no alumínio quando a página
       corre. Uma varredura por shader no metal custaria uma recompilação do
       material do modelo; mover a luz custa três senos. */
    if (luzOuro.current) {
      const a = (cena.brilho || 0) * Math.PI * 2 - 0.9;
      luzOuro.current.position.set(Math.sin(a) * 4.2, 1.4 + Math.cos(a) * 0.9, Math.cos(a) * 3.6);
      luzOuro.current.intensity = 2.6 * p;
    }

    if (tela.alvoMix !== undefined) {
      tela.uniforms.uMix.value = damp(tela.uniforms.uMix.value, tela.alvoMix, 0.07, dt);
      if (Math.abs(tela.uniforms.uMix.value - tela.alvoMix) < 0.002) {
        tela.uniforms.uMix.value = tela.alvoMix;
        delete tela.alvoMix;
      }
    }

    if (cena.canal !== tela.atual) trocarCanal(cena.canal);

    /* ── Colocação ────────────────────────────────────────────────────
       x e y na MESMA régua: -1 = borda esquerda/inferior, +1 = direita/
       superior. O menor lado manda na escala para o objeto não inchar em
       telas ultralargas. */
    const menorLado = Math.min(viewport.width, viewport.height);
    const escalaBase = c.scale * menorLado * 0.42;

    /* Entrar na tela é geometria, não mágica: mede-se quanto falta para o
       painel encher a janela e leva-se o centro dele ao centro do quadro.
       Refeito a cada quadro, então um resize no meio da aproximação não
       deixa o objeto torto. */
    const alturaTela = telaLocal.altura * escalaBase || 1;
    const larguraTela = telaLocal.largura * escalaBase || 1;
    const precisa = Math.max(
      viewport.height / alturaTela,
      viewport.width / larguraTela
    ) * 1.04;
    const fator = 1 + (precisa - 1) * s.zoom;
    const escala = escalaBase * fator;

    const px = c.x * viewport.width * 0.5;
    const py = c.y * viewport.height * 0.5;

    /* Durante a aproximação, o objeto é puxado para que o CENTRO DO PAINEL
       — e não o centro do notebook — fique no meio da janela. */
    const cx = telaLocal.centro.x * escala;
    const cy = telaLocal.centro.y * escala;
    g.position.set(px * (1 - s.zoom) - cx * s.zoom, py * (1 - s.zoom) - cy * s.zoom, 0);

    /* Ao entrar na tela, a perspectiva se endireita: uma tela cheia e torta
       lê como erro, não como câmera. */
    const endireita = 1 - s.zoom;
    /* O giro contínuo entra AQUI, somado à pose — e é atenuado por
       `endireita` como o resto: durante a aproximação final a tela precisa
       ficar de frente, e um objeto ainda girando ali arruinaria o momento.
       Também é atenuado pela ESCALA: perto da câmera, o mesmo ângulo vira um
       deslocamento enorme na tela. */
    const arrasto = (cena.giro || 0) * (1 - Math.min(1, c.scale)) * 0.7;
    g.rotation.set(
      (c.rotX + s.rx) * endireita,
      (c.rotY + s.ry + arrasto) * endireita,
      0
    );
    g.scale.setScalar(escala);

    /* Sonda de colocação: sem ela, "o objeto está deslocado" é discussão de
       opinião sobre um pixel num canvas. */
    if (sonda) {
      const caixa = new THREE.Box3().setFromObject(g);
      sonda.current = {
        grupo: [+g.position.x.toFixed(3), +g.position.y.toFixed(3)],
        centroMundo: caixa.getCenter(new THREE.Vector3()).toArray().map((v) => +v.toFixed(3)),
        viewport: [+viewport.width.toFixed(3), +viewport.height.toFixed(3)],
        escala: +escala.toFixed(3),
      };
    }
  });

  /* O modelo é grande e a janela pequena: sem isto, um resize deixa a
     projeção defasada por um quadro e o objeto pula. */
  useEffect(() => () => undefined, [size.width, size.height]);

  return (
    <group ref={grupo}>
      <primitive object={modelo} />
    </group>
  );
}

/**
 * Cena 3D única e persistente: um só Canvas para a página inteira.
 *
 * Montar e desmontar o modelo por seção custaria uma recompilação de shader
 * e um pico de GC a cada troca — e, pior, impediria justamente o que o
 * briefing pede: ver o objeto PERCORRENDO o caminho entre as seções.
 *
 * Nunca captura o ponteiro: quem conduz o modelo é o scroll.
 */
export default function LaptopScene({ active }) {
  const luzOuro = useRef(null);
  const sonda = useRef(null);
  if (typeof window !== "undefined" && parametro("laptop") === "debug") {
    window.__pos = () => sonda.current;
  }
  /* Aparelho pequeno paga o dobro por pixel e costuma ter menos memória de
     textura. O 3D FICA — tirá-lo seria tirar o fio condutor da narrativa —
     mas com metade da densidade e sem o mapa de ambiente, que é o item mais
     caro da cena. */
  const magro = typeof window !== "undefined" && window.innerWidth < 900;

  return (
    <div className="story__laptop" aria-hidden="true">
      <Canvas
        /* Teto de 1.5: acima disso o ganho é invisível e o custo de
           preenchimento dobra em telas retina. */
        dpr={magro ? [1, 1] : [1, 1.5]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0, 4.2], fov: 34 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
        }}
      >
        {/* Preto, dourado e neutro — nada de neon. */}
        <ambientLight intensity={0.6} color="#8f95a3" />
        {/* Chave neutra: é ela que desenha a forma. Dourada, pintava o
            alumínio inteiro de mostarda e o objeto perdia o volume. */}
        <directionalLight position={[2.6, 3, 4]} intensity={2.4} color="#fdfbf6" />
        {/* Contorno dourado. A posição é escrita a cada quadro pelo loop: é
            ela que faz o reflexo correr pelo alumínio conforme a página
            corre — o mesmo dourado da hero, agora no objeto. */}
        <directionalLight ref={luzOuro} position={[-3.4, 1.6, -2.6]} intensity={2.6} color="#c9a84c" />
        <pointLight position={[0.4, -2, 3]} intensity={1.4} color="#cfd6e2" distance={12} />

        <Suspense fallback={null}>
          {/* Reflexo: sem environment o alumínio fica plástico. `studio` é
              neutro e barato — nada é baixado, o mapa é gerado. */}
          {!magro && <Environment preset="studio" environmentIntensity={0.35} />}
          <Laptop luzOuro={luzOuro} sonda={sonda} />
        </Suspense>
      </Canvas>
    </div>
  );
}
