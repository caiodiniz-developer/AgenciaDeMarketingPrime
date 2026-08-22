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
const ROT_BASE = [-Math.PI / 2, Math.PI, 0];

/** Material do painel da tela no arquivo original. É ele que vira vídeo. */
const MATERIAL_DA_TELA = "aiStandardSurface1SG";

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
    gl_FragColor = vec4(cor * borda * uLigada, 1.0);
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

function Laptop() {
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
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      toneMapped: false,
    });
    return { vA, vB, uniforms, material, atual: cena.canal, usandoA: true };
  }, []);

  /* ── Modelo normalizado ──────────────────────────────────────────────
     O arquivo vem em escala e centro arbitrários. Normalizar uma vez deixa
     as poses do conteúdo em números legíveis (-1 a 1 na tela). */
  const { modelo, telaLocal } = useMemo(() => {
    const raiz = new THREE.Group();
    const clone = scene.clone(true);

    /* A orientação é aplicada em um nó INTERMEDIÁRIO, antes de medir: assim
       a caixa medida já é a do objeto de pé, e as poses do conteúdo falam
       da silhueta que o leitor vê, não da que veio do arquivo. */
    clone.rotation.set(...ROT_BASE);
    clone.updateMatrixWorld(true);

    let painel = null;

    clone.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = false;

      const nome = child.material?.name;
      if (nome === MATERIAL_DA_TELA && !painel) {
        painel = child;
        return;
      }

      if (child.material) {
        child.material = child.material.clone();
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

    return { modelo: raiz, telaLocal: local };
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
  const suave = useRef({ zoom: 0, rx: 0, ry: 0, ligada: 0.25 });
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
    const l = parado ? 0.5 : 0.11;
    c.x = damp(c.x, alvo.x, l, dt);
    c.y = damp(c.y, alvo.y, l, dt);
    c.scale = damp(c.scale, alvo.scale, l, dt);
    c.rotY = damp(c.rotY, alvo.rotY, l, dt);
    c.rotX = damp(c.rotX, alvo.rotX, l, dt);
    s.zoom = damp(s.zoom, cena.zoom || 0, 0.16, dt);

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
       viajando pela borda da janela. */
    const dentro = 1 - Math.min(1, Math.max(0, (Math.abs(c.x) - 0.85) / 0.8));
    s.ligada = damp(s.ligada, 0.3 + dentro * 0.7, 0.08, dt);
    tela.uniforms.uLigada.value = s.ligada;

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
    g.rotation.set((c.rotX + s.rx) * endireita, (c.rotY + s.ry) * endireita, 0);
    g.scale.setScalar(escala);
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
  return (
    <div className="story__laptop" aria-hidden="true">
      <Canvas
        /* Teto de 1.5: acima disso o ganho é invisível e o custo de
           preenchimento dobra em telas retina. */
        dpr={[1, 1.5]}
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
        {/* Contorno dourado, na mesma direção que os GodRays sugerem ao fundo. */}
        <directionalLight position={[-3.4, 1.6, -2.6]} intensity={2.6} color="#c9a84c" />
        <pointLight position={[0.4, -2, 3]} intensity={1.4} color="#cfd6e2" distance={12} />

        <Suspense fallback={null}>
          {/* Reflexo: sem environment o alumínio fica plástico. `studio` é
              neutro e barato — nada é baixado, o mapa é gerado. */}
          <Environment preset="studio" environmentIntensity={0.35} />
          <Laptop />
        </Suspense>
      </Canvas>
    </div>
  );
}
