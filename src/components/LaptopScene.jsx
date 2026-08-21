import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { storyProgress } from "../lib/progress";
import { sections } from "../content/story";
import { prefersReducedMotion } from "../lib/media";

const MODEL = "/laptop.glb";
useGLTF.preload(MODEL);

/**
 * Paradas do modelo ao longo das seções.
 *
 * O progresso da espinha vai de 0 (topo da narrativa encostando na base da
 * tela) a 1 (base da narrativa na base da tela). Com seções de uma tela cada,
 * a seção i tem o TOPO no topo da tela em (i + 1) / n — que é quando ela está
 * de fato sendo lida. Ancorar no centro, (i + 0.5) / n, adianta a pose em
 * meia seção: o modelo nunca chega ao lugar previsto enquanto o texto está
 * em cena, e a última pose só aconteceria depois do fim da página.
 */
const STOPS = sections.map((s, i) => ({
  at: (i + 1) / sections.length,
  ...s.laptop,
}));

const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, lambda, dt) => a + (b - a) * (1 - Math.pow(1 - lambda, dt * 60));

/** Interpola as paradas; antes da primeira e depois da última, segura o valor. */
function poseAt(p) {
  if (p <= STOPS[0].at) return STOPS[0];
  if (p >= STOPS[STOPS.length - 1].at) return STOPS[STOPS.length - 1];

  for (let i = 0; i < STOPS.length - 1; i++) {
    const a = STOPS[i];
    const b = STOPS[i + 1];
    if (p > b.at) continue;

    // Suavização de borda: sem isto a virada de rumo em cada parada é um bico.
    const raw = (p - a.at) / (b.at - a.at);
    const t = raw * raw * (3 - 2 * raw);

    return {
      x: lerp(a.x, b.x, t),
      y: lerp(a.y, b.y, t),
      scale: lerp(a.scale, b.scale, t),
      rotY: lerp(a.rotY, b.rotY, t),
      rotX: lerp(a.rotX, b.rotX, t),
    };
  }
  return STOPS[STOPS.length - 1];
}

function Laptop() {
  const { scene } = useGLTF(MODEL);
  const group = useRef(null);
  const { viewport } = useThree();
  const still = prefersReducedMotion();

  /* O modelo vem do Sketchfab em escala e centro arbitrários: normaliza uma
     vez para que as poses do conteúdo sejam números legíveis. */
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    /* A ordem importa: `position` vive no espaço do PAI e não é afetada pela
       escala do próprio objeto. Subtrair o centro em unidades originais e só
       então encolher a geometria joga o modelo para longe do pivô — era isso
       que empurrava o laptop para baixo, independente da pose pedida. */
    const unit = 1 / Math.max(size.x, size.y, size.z);
    clone.scale.setScalar(unit);
    clone.position.copy(center).multiplyScalar(-unit);

    clone.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = false;
      child.receiveShadow = false;
      if (child.material) {
        child.material.envMapIntensity = 0.6;
        // O alumínio original vem claro demais para uma página preta.
        if (child.material.metalness !== undefined) {
          child.material.metalness = Math.min(1, (child.material.metalness || 0.4) + 0.25);
          child.material.roughness = Math.max(0.18, (child.material.roughness ?? 0.5) - 0.1);
        }
      }
    });

    return clone;
  }, [scene]);

  const current = useRef({ x: 0, y: 0, scale: 1, rotY: 0, rotX: 0 });

  useFrame((_state, delta) => {
    if (!group.current) return;

    const target = poseAt(storyProgress.value);
    const dt = Math.min(delta, 0.05);
    const c = current.current;

    // Persegue a pose em vez de saltar para ela: o mesmo princípio do scrub
    // do vídeo — o alvo é do scroll, o movimento é do relógio.
    const l = still ? 0.4 : 0.09;
    c.x = damp(c.x, target.x, l, dt);
    c.y = damp(c.y, target.y, l, dt);
    c.scale = damp(c.scale, target.scale, l, dt);
    c.rotY = damp(c.rotY, target.rotY, l, dt);
    c.rotX = damp(c.rotX, target.rotX, l, dt);

    const menorLado = Math.min(viewport.width, viewport.height);

    // x e y na MESMA régua: -1 = borda esquerda/inferior, +1 = direita/superior.
    group.current.position.set(c.x * viewport.width * 0.5, c.y * viewport.height * 0.5, 0);
    group.current.rotation.set(c.rotX, c.rotY, 0);
    group.current.scale.setScalar(c.scale * menorLado * 0.42);
  });

  return (
    <group ref={group}>
      <primitive object={model} />
    </group>
  );
}

/**
 * Cena 3D persistente, grudada atrás do texto das seções.
 * Fica na camada entre a luz e a tipografia, e nunca captura o ponteiro —
 * quem conduz o modelo é o scroll, não o mouse.
 */
export default function LaptopScene({ active }) {
  return (
    <div className="story__laptop" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        frameloop={active ? "always" : "never"}
        camera={{ position: [0, 0, 4.2], fov: 34 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <ambientLight intensity={0.75} color="#9aa0ad" />
        {/* Chave neutra: é ela que desenha a forma. Dourada, ela pintava o
            alumínio inteiro de mostarda e o objeto perdia o volume. */}
        <directionalLight position={[2.6, 3, 4]} intensity={2.6} color="#fdfbf6" />
        {/* Contorno dourado: a mesma fonte que os GodRays sugerem ao fundo. */}
        <directionalLight position={[-3.4, 1.6, -2.6]} intensity={2.4} color="#c9a84c" />
        <pointLight position={[0.4, -2, 3]} intensity={1.6} color="#cfd6e2" distance={10} />

        <Suspense fallback={null}>
          <Laptop />
        </Suspense>
      </Canvas>
    </div>
  );
}
