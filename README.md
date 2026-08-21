# Agência Prime

Site da Prime: uma hero em vídeo dirigido pelo scroll, seguida de uma narrativa
em oito seções — cada uma com uma interação-assinatura própria.

```bash
npm install
npm run dev          # desenvolvimento
npm run build        # produção → dist/
npm run preview      # serve o build
```

## Posicionamento

A Prime não é apresentada como "uma agência que faz posts". Ela é o braço de
comunicação da empresa cliente: **a empresa cuida do negócio, a Prime cuida de
como esse negócio é visto**. A página inteira serve a essa ideia, nesta ordem:

| Seção | Trabalho que ela faz | Interação-assinatura |
|---|---|---|
| hero | primeira impressão | vídeo dirigido pelo scroll |
| diagnóstico | o problema é do leitor | palavras acendendo + faixa tipográfica |
| serviços | a extensão do que a Prime assume | lista interativa, uma composição por frente |
| digital | prova de capacidade em web | computador CSS 3D: tela rola por dentro e toma a viewport |
| audiovisual | prova de capacidade em vídeo | íris de `clip-path` abrindo até a tela cheia |
| sistema | como as frentes se conectam | cena presa que se reorganiza em 4 estados |
| clientes | prova social | disputa por espaço: o apontado toma a tela |
| prova | por que funciona | respiro: tema claro, leitura calma |
| contato | o próximo passo | fecho cinematográfico + botão magnético |

Oito técnicas, recombinadas: SplitText com máscara, `clip-path`, pin + scrub,
parallax em camadas, timelines sobrepostas, perspectiva CSS 3D, disputa por
`flex-grow` e desenho de SVG. Nenhuma seção repete a combinação da anterior.


## Como funciona

**A hero não dá play no vídeo.** O scroll avança e recua os quadros: o trilho
(`TRACK_VH`) define a duração, o palco gruda dentro dele, e `useVideoScrub`
persegue o alvo com amortecimento em vez de escrever `currentTime` a cada tique
da roda — é o que separa "manteiga" de "travado".

Camadas do palco, de trás para frente:

```
vídeo → GodRays → gradientes/vinheta/grain → tipografia
```

A luz nasce **dentro** da cena, entre o vídeo e os overlays. É por isso que ela
parece pertencer ao quadro em vez de estar colada por cima.

Depois da hero, `Story` mantém a luz e o laptop 3D grudados (`sticky`)
atravessando as seções. As de tema `bone` são opacas de propósito: cortam a
cena, devolvem respiro à leitura e fazem a volta ao preto valer.

## Sistema de motion

`src/lib/motion.js` guarda curvas, durações, staggers e a hierarquia de entrada
(`BEAT`). Os valores vivem num lugar só porque é o ritmo compartilhado que faz
o site parecer intencional — espalhados, cada seção inventa o próprio tempo.

Regra de entrada: **os elementos se sobrepõem**. Se o título só começa quando o
rótulo termina, a seção entra em degraus e denuncia a máquina.

## Acrescentar ou mudar conteúdo

Tudo vem de [`src/content/story.js`](src/content/story.js): copy, serviços,
estados do sistema, temas, poses do 3D e a navegação.

Para uma seção nova, acrescente um objeto a `sections`, um ramo em
[`Section.jsx`](src/components/Section.jsx) e o CSS. A coreografia base é
genérica: `data-sec-label`, `data-sec-title`, `data-sec-body`, `data-sec-item`
e `data-sec-rule` entram sozinhos, na hierarquia certa.

`laptop` posiciona o modelo 3D: `x` e `y` de −1 a 1, onde `(-1,-1)` é o canto
inferior esquerdo e `(1,1)` o superior direito; acima de 1 ele espia por fora.
`laptop: null` apaga o modelo — use quando a seção tiver palco próprio. A regra
é nunca invadir a coluna de texto.

## Clientes e cases: só o que é real

A seção de clientes é dirigida por `clientes` em `story.js` e desenha apenas o
que existe. Hoje há duas marcas reais — **Real Pisos** e **Wanderson Carvalho**
— e os nomes vieram das próprias artes, não de suposição.

Continua faltando, e por isso não é desenhado:

- `video` e `poster` de cada cliente (o painel em foco ganha vídeo de fundo);
- `frentes` — só o que a Prime realmente fez para cada um;
- `depoimento` — só se a pessoa tiver dito de fato.

`cases` segue vazio: não há peça de trabalho no repositório. Inventar cliente,
print, serviço prestado ou depoimento seria fabricar prova — o oposto do que
esta página vende.

**A logo de cliente nunca é recolorida.** Recolorir marca de terceiro é mexer
no que não é nosso. `node scripts/trim-clientes.mjs` apara a margem vazia,
mede a luminância e diz se a marca precisa de placa clara (`placa: true`) ou
já é clara o bastante para o fundo preto.

## Assets gerados

Os arquivos em `public/media/` e `public/logo-*.png` são **derivados** — não
edite à mão, rode os scripts:

```bash
npm run encode:hero          # media/hero-master.mp4 → variantes all-intra + poster
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
node scripts/verify.mjs http://localhost:4173/
node scripts/shots.mjs  http://localhost:4173/ ./.verify/tour 1440 900
```

`verify.mjs` mede overflow horizontal, razão entre entrelinha e corpo, folga
para acentos nos títulos, o `currentTime` acompanhando o scroll nos dois
sentidos, se o Lenis realmente intercepta a roda, framerate, `will-change`
órfão, cada link da navegação, as interações (abertura, cursor, lista de
serviços, expansão do vídeo, cena do sistema, botão magnético, rodapé) e o
caminho de `prefers-reduced-motion`.

Dois detalhes do harness que já custaram um diagnóstico errado:

- **O Chrome headless reporta `prefers-reduced-motion: reduce` por padrão.**
  Sem desligar isso, toda verificação mede o caminho reduzido e conclui que o
  site funciona — enquanto nada do movimento real é testado.
- **Com seções presas, rolar por `getBoundingClientRect` erra o destino**: o
  espaçador do pin muda o layout durante a própria rolagem. Os scripts
  aproximam e corrigem (`irPara`).

`SOFT_GL=1` força WebGL por software (reprodutível, mas mede o piso do
renderizador, não o do site).

## Acessibilidade

`prefers-reduced-motion` remove o movimento autônomo — cursor, luz que segue o
ponteiro, parallax, playhead — mas **não** a sequência de scroll: rolar é
resposta 1:1 ao gesto do usuário, e apagar a feature principal da página
puniria quem ligou a preferência. A cena do sistema nasce montada no estado
final, as entregas dos serviços ficam todas abertas, e o Lenis continua, só com
a inércia encurtada.

A lista de serviços responde a teclado (`focusin`), não só a ponteiro.

## Duas armadilhas de ScrollTrigger que este projeto encontrou

Ambas custaram diagnóstico errado antes de aparecerem numa medição:

**1. Ordem de criação com `pin`.** Cada seção presa acrescenta telas de altura
ao documento. Um trigger criado *antes* dela guarda a posição de um layout que
deixou de existir — e a seção seguinte nasce com o estado final já aplicado.
Em `Story.jsx`, as assinaturas que prendem são criadas primeiro, e um
`ScrollTrigger.refresh()` fecha a montagem.

**2. Faixas precisam ser contíguas.** Com `start: "top 60%"` e
`end: "bottom 40%"`, uma seção presa por três telas sai da própria faixa logo
no início do pin: dali até a próxima não há nenhuma ativa, e a cena congela no
estado da anterior. A faixa de cada seção termina onde a próxima começa
(`endTrigger`), o que também a imuniza contra o pin.
