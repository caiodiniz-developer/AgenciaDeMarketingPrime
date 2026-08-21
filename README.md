# Agência Prime

Experiência de scroll cinematográfico: uma hero em vídeo dirigido pelo scroll,
seguida de uma narrativa em seções alternando preto e bege, com luz volumétrica
(GodRays) e um modelo 3D atravessando a cena.

```bash
npm install
npm run dev          # desenvolvimento
npm run build        # produção → dist/
npm run preview      # serve o build
```

## Como funciona

**A hero não dá play no vídeo.** O scroll é que avança e recua os quadros: o
trilho (`TRACK_VH`) define quanto scroll a sequência dura, o palco gruda dentro
dele, e `useVideoScrub` persegue o alvo com amortecimento em vez de escrever
`currentTime` a cada tique da roda — é o que separa "manteiga" de "travado".

Camadas do palco, de trás para frente:

```
vídeo → GodRays → gradientes/vinheta/grain → tipografia
```

A luz nasce **dentro** da cena, entre o vídeo e os overlays. É por isso que ela
parece pertencer ao quadro em vez de estar colada por cima.

Depois da hero, `Story` mantém a luz e o laptop 3D grudados (`sticky`)
atravessando todas as seções. As seções de tema `bone` são opacas de propósito:
cortam a cena, devolvem respiro à leitura e fazem a volta ao preto valer.

## Acrescentar uma seção

Tudo vem de [`src/content/story.js`](src/content/story.js). Acrescente um objeto
a `sections` — o trilho, a navegação, a luz e a pose do 3D se ajustam sozinhos:

```js
{
  id: "novo",
  layout: "split",     // split · grid · glyphs · steps · statement · list · cta
  theme: "ink",        // ink (preto, deixa passar luz e 3D) · bone (bege opaco)
  rays: true,          // liga a luz dourada; alternar é o que a mantém rara
  label: "Rótulo",
  title: ["Primeira linha,", "segunda linha."],
  body: [{ text: "Texto com " }, { text: "destaque", tone: "gold" }, { text: "." }],
  laptop: { x: 0.6, y: -0.4, scale: 0.8, rotY: -0.9, rotX: 0.18 },
}
```

`laptop`: `x` e `y` vão de −1 a 1 — `(-1,-1)` é o canto inferior esquerdo da
tela, `(1,1)` o superior direito. Acima de 1 o modelo espia por fora do quadro.
A regra é nunca invadir a coluna de texto.

Para um layout novo, acrescente o ramo em [`Section.jsx`](src/components/Section.jsx)
e o CSS correspondente. A coreografia é genérica: qualquer elemento com
`data-sec-item` entra em cascata, `data-draw` é riscado pelo DrawSVG e
`data-pop` aparece por escala depois do traço.

## Assets gerados

Os arquivos em `public/media/` e `public/logo-*.png` são **derivados** — não
edite à mão, rode os scripts:

```bash
npm run encode:hero   # media/hero-master.mp4 → variantes all-intra + poster
node scripts/make-logo.mjs   # public/logo.png → versões clara e escura
```

O encode é o ponto crítico da hero. Vídeo comum só tem keyframe a cada poucos
segundos, então exibir um quadro qualquer obriga o decoder a voltar ao keyframe
anterior — e o scrub engasga. As variantes são **all-intra** (`-g 1
-keyint_min 1 -sc_threshold 0`): um keyframe por quadro, cada um decodifica
sozinho. O script confere o resultado com `ffprobe` em vez de confiar no
comando; se aparecer um quadro não-keyframe, ele falha.

Três variantes são servidas por capacidade de rede e tela (`src/lib/media.js`):
1080p (35 MB), 720p (16 MB), 480p (5,4 MB). Com `saveData`, rede 2G ou aparelho
muito fraco, o vídeo sai de cena e o poster assume — a narrativa por scroll
continua inteira.

## Verificação

Animação não se valida lendo código.

```bash
npm run preview
node scripts/verify.mjs http://localhost:4173/   # mede e reporta
node scripts/shots.mjs  http://localhost:4173/ ./.verify/tour 1440 900
```

`verify.mjs` mede overflow horizontal, razão entre entrelinha e corpo, folga
para acentos nos títulos, o `currentTime` acompanhando o scroll nos dois
sentidos, se o Lenis realmente intercepta a roda, framerate, `will-change`
órfão, cada link da navegação e o caminho de `prefers-reduced-motion`.
`SOFT_GL=1` força WebGL por software (reprodutível, mas mede o piso do
renderizador, não o do site).

## Acessibilidade

`prefers-reduced-motion` remove o movimento autônomo, mas **não** a sequência de
scroll: rolar é resposta 1:1 ao gesto do usuário, e apagar a feature principal
da página puniria quem ligou a preferência. O Lenis também continua — só com a
inércia encurtada.
