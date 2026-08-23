/**
 * Conteúdo e ritmo da narrativa. Fonte única de verdade: altura do trilho,
 * marcos da timeline, temas, poses do 3D e markup das seções derivam daqui.
 *
 * POSICIONAMENTO
 * A Prime não é "uma agência que faz posts". Ela é o braço de comunicação da
 * empresa cliente: a empresa cuida do negócio, a Prime cuida de como esse
 * negócio é visto, lembrado e procurado.
 *
 * RITMO (o que o leitor deve pensar em cada parada)
 *   hero       → "essa agência é diferente"
 *   manifesto  → "talvez minha empresa tenha esse problema"
 *   serviços   → "eles assumem a comunicação inteira"
 *     social · web · design · branding · estratégia
 *   método     → "existe processo por trás"
 *   por que    → "agora entendi o valor"
 *   clientes   → "empresas reais confiam"
 *   contato    → "quero falar com a Prime"
 *
 * Nem toda seção é um WOW. Alterna impacto e respiro.
 */

/* ── HERO ──────────────────────────────────────────────────────────────── */

export const HERO = {
  wordmark: "AGÊNCIA PRIME",
  tagline: "Sua empresa é boa. Agora precisa parecer.",
  cue: "role para explorar",
};

/** Altura do trilho da hero: define quanto scroll a sequência de vídeo dura. */
export const TRACK_VH = 420;

/** Marcos em fração do progresso do trilho (0 → 1). */
export const MARKS = {
  cue: [0.006, 0.034],
  heroExit: [0.06, 0.34],
  scrim: [0.04, 0.3],
  /** A luz nasce fraca, atinge o pico no meio da hero e recua na saída. */
  rays: { in: [0.02, 0.38], peak: [0.38, 0.62], out: [0.62, 0.94] },
  blackout: [0.88, 1.0],
};

/* ── CONTATO ───────────────────────────────────────────────────────────── */

/**
 * Um número, escrito uma vez. O link do WhatsApp exige o formato E.164 sem
 * sinais; a versão com máscara é só para leitura humana.
 */
const ZAP = "5511912992403";

export const CONTATO = {
  whatsapp: {
    numero: ZAP,
    exibicao: "+55 11 91299-2403",
    link: `https://wa.me/${ZAP}?text=${encodeURIComponent(
      "Olá! Vim pelo site da Prime e quero falar sobre a comunicação da minha empresa."
    )}`,
  },
  email: "contato@agenciaprime.com.br",
};

/* ── SERVIÇOS ──────────────────────────────────────────────────────────── */

/**
 * CINCO frentes, e cada uma é uma SEÇÃO inteira — não um card.
 *
 * A ordem não é alfabética nem por importância: é narrativa. Social é o que o
 * empresário reconhece de imediato; Estratégia é o que ele só valoriza depois
 * de ver o resto. Cada frente PLANTA a próxima: o feed do social entra na tela
 * do notebook e vira Web; a interface Web se desmonta e vira o grid do Design;
 * o layout perde tudo menos marca e vira Branding; a marca ganha conexões e
 * vira Estratégia.
 *
 * `video` é o arquivo real em /public/videos. `entregas` é a lista concreta:
 * é ela que responde "isso inclui o quê?" e tira a seção do abstrato.
 */
export const servicos = [
  {
    id: "social",
    numero: "01",
    nome: "Social Media",
    video: "social",
    chamada: ["O perfil é a", "vitrine que ninguém", "pode fechar."],
    linha: "Presença diária, não postagem esporádica.",
    corpo: [
      { text: "Planejamento, produção e publicação. A gente assume o perfil " },
      { text: "inteiro", tone: "gold" },
      { text: " — do que vai ser dito ao dia em que vai ao ar." },
    ],
    entregas: [
      "Gestão de Instagram",
      "Calendário editorial",
      "Posts e carrosséis",
      "Reels e captação",
      "Stories e bastidores",
      "Legendas e direção de conteúdo",
    ],
  },
  {
    id: "web",
    numero: "02",
    nome: "Web",
    video: "web",
    chamada: ["O único canal", "que é seu."],
    linha: "Rede social é aluguel. Site é endereço.",
    corpo: [
      { text: "Algoritmo muda, alcance cai, plataforma some. O site " },
      { text: "fica", tone: "gold" },
      { text: " — e é ele que decide se te procuram ou te comparam." },
    ],
    entregas: [
      "Sites institucionais",
      "Landing pages",
      "Páginas de campanha",
      "Interfaces sob medida",
      "Experiências digitais",
      "Manutenção e evolução",
    ],
    /* Os argumentos que aparecem enquanto o notebook se aproxima. Ficam aqui
       porque são conteúdo, não legenda de animação. */
    razoes: [
      {
        chave: "24h",
        titulo: "Não fecha às 18h",
        texto:
          "O cliente pesquisa de madrugada, no fim de semana, no meio de uma reunião. O site atende sempre.",
      },
      {
        chave: "seu",
        titulo: "Ninguém pode tirar de você",
        texto:
          "Perfil bloqueado é negócio parado. O endereço é da empresa, e a lista de quem chegou por ele também.",
      },
      {
        chave: "tamanho",
        titulo: "Define o seu tamanho em oito segundos",
        texto:
          "É o tempo que o visitante leva para decidir se você é grande ou improvisado. Ele decide antes de ler.",
      },
    ],
  },
  {
    id: "design",
    numero: "03",
    nome: "Design",
    video: "design",
    chamada: ["Nada aqui", "sai de template."],
    linha: "Cada peça é desenhada para a sua marca.",
    corpo: [
      { text: "Layout pronto entrega o que você é: mais um. A peça " },
      { text: "desenhada", tone: "gold" },
      { text: " entrega o que você construiu." },
    ],
    entregas: [
      "Posts sob medida",
      "Carrosséis",
      "Campanhas",
      "Flyers e material impresso",
      "Apresentações",
      "Peças publicitárias",
    ],
  },
  {
    id: "branding",
    numero: "04",
    nome: "Branding",
    video: "branding",
    chamada: ["A marca vem", "antes da arte."],
    linha: "Sem identidade, toda peça recomeça do zero.",
    corpo: [
      { text: "Cor, tipografia, símbolo e regra de uso. É o que faz vinte peças diferentes parecerem " },
      { text: "da mesma empresa", tone: "gold" },
      { text: "." },
    ],
    entregas: [
      "Criação de marca",
      "Identidade visual",
      "Paleta e tipografia",
      "Manual de aplicação",
      "Reposicionamento",
      "Padronização",
    ],
  },
  {
    id: "estrategia",
    numero: "05",
    nome: "Estratégia",
    video: "estrategia",
    chamada: ["Antes de produzir,", "decidir."],
    linha: "A pergunta certa economiza seis meses de post errado.",
    corpo: [
      { text: "Para quem falar, o que defender, em que ordem. Sem isso, produzir muito só acelera o " },
      { text: "erro", tone: "gold" },
      { text: "." },
    ],
    entregas: [
      "Posicionamento",
      "Plano de comunicação",
      "Direção criativa",
      "Estratégia de conteúdo",
      "Campanhas",
      "Calendário anual",
    ],
  },
];

/* ── MÁQUINA PRIME (o método) ──────────────────────────────────────────── */

/**
 * O método sem os quatro cards numerados.
 *
 * A cena mostra o que ENTRA (informação bruta da empresa), o que ACONTECE
 * (as três operações) e o que SAI (comunicação pronta). É a mesma promessa —
 * "existe processo por trás" — dita por uma imagem em vez de uma lista.
 */
export const maquina = {
  entradas: [
    { id: "empresa", rotulo: "A EMPRESA", nota: "o que ela faz de verdade" },
    { id: "produto", rotulo: "O PRODUTO", nota: "o que ela vende" },
    { id: "publico", rotulo: "O PÚBLICO", nota: "quem precisa disso" },
    { id: "objetivo", rotulo: "O OBJETIVO", nota: "onde ela quer chegar" },
  ],
  etapas: [
    {
      id: "escutar",
      numero: "01",
      titulo: "Escutar",
      texto:
        "Uma conversa longa com quem toca o negócio. Antes de qualquer arte, entender o que a empresa realmente vende e para quem.",
    },
    {
      id: "decidir",
      numero: "02",
      titulo: "Decidir",
      texto:
        "O que a marca vai defender, o tom, o que fica de fora. É a etapa que ninguém vê e que segura tudo o que vem depois.",
    },
    {
      id: "produzir",
      numero: "03",
      titulo: "Produzir",
      texto:
        "Marca, peça, vídeo, página. Tudo saindo do mesmo lugar, com a mesma direção — por isso nada sai do tom.",
    },
    {
      id: "publicar",
      numero: "04",
      titulo: "Colocar no ar",
      texto:
        "No calendário, na frequência combinada. Comunicação é constância: o que não vai ao ar não existe.",
    },
  ],
  saidas: [
    "CONTEÚDO",
    "DESIGN",
    "VÍDEO",
    "MARCA",
    "SITE",
    "CAMPANHA",
    "PRESENÇA",
  ],
  fecho: "A Prime transforma comunicação em sistema.",
};

/* ── SISTEMA PRIME (por que funciona) ──────────────────────────────────── */

/**
 * Cinco forças em volta da MARCA. Cada uma, quando escolhida, reorganiza a
 * composição para DEMONSTRAR o próprio conceito — consistência alinha,
 * frequência preenche, direção converge, qualidade refina.
 *
 * `demo` é lido pelo componente para decidir qual reorganização rodar.
 */
export const forcas = [
  {
    id: "consistencia",
    rotulo: "CONSISTÊNCIA",
    demo: "alinhar",
    titulo: "A mesma empresa em toda peça",
    texto:
      "Vinte publicações que parecem de vinte fornecedores diferentes não constroem marca nenhuma. Constância visual é o que faz a lembrança grudar.",
  },
  {
    id: "estrategia",
    rotulo: "ESTRATÉGIA",
    demo: "convergir",
    titulo: "Cada peça puxando para o mesmo lado",
    texto:
      "Publicar sem direção é gastar. Quando existe um objetivo, o post de terça e a campanha de junho trabalham para a mesma coisa.",
  },
  {
    id: "qualidade",
    rotulo: "QUALIDADE",
    demo: "refinar",
    titulo: "O acabamento é lido como competência",
    texto:
      "Ninguém audita seu processo interno. Julgam pelo que veem — e o que veem é o acabamento da sua comunicação.",
  },
  {
    id: "frequencia",
    rotulo: "FREQUÊNCIA",
    demo: "preencher",
    titulo: "Aparecer é metade do trabalho",
    texto:
      "A marca que some é a marca que é esquecida. Ritmo vale mais do que a peça perfeita que sai a cada seis meses.",
  },
  {
    id: "direcao",
    rotulo: "DIREÇÃO",
    demo: "apontar",
    titulo: "Alguém decidindo, não só executando",
    texto:
      "Sem direção criativa, cada peça é uma opinião nova. Com direção, existe um critério — e o critério é o que sustenta o padrão.",
  },
];

/* ── SEÇÕES ────────────────────────────────────────────────────────────── */

/**
 * `theme`  — "ink" (preto, deixa passar a luz e o 3D) ou "bone" (bege opaco,
 *            que corta a cena e devolve respiro à leitura).
 * `rays`   — liga a luz dourada. Alternar é o que mantém o efeito raro.
 * `laptop` — pose do modelo 3D quando a seção está em cena.
 *
 *            x e y de -1 a 1: (-1,-1) é o canto inferior esquerdo da tela,
 *            (1,1) o superior direito. Além de ±1.6 o modelo está fora do
 *            quadro — e é assim que ele SAI de cena, viajando, nunca sumindo.
 *            Depois da seção Web o objeto fica na MARGEM ESQUERDA e só sobe
 *            e desce por ela, até voltar ao centro no fecho. Uma pose à
 *            direita no meio dessa sequência obrigava a atravessar a tela
 *            inteira duas vezes seguidas — ida e volta —, que é o oposto de
 *            trajeto: é vaivém. Alternar entre
 *            as duas bordas obrigaria a atravessar a tela inteira em cada
 *            troca — e a travessia passa por cima do conteúdo que a seção
 *            acabou de revelar.
 *
 *            NENHUMA seção manda o objeto para longe do quadro. Ele é o fio
 *            condutor da página: some, e a narrativa visual se parte em onze
 *            pedaços. Em vez de sair, ele circula pelas BORDAS — entra e sai
 *            pela esquerda e pela direita, alto e baixo — mostrando sempre um
 *            pedaço, e só ocupa o centro na seção Web, que é dele.
 *
 *            A pose é interpolada com scrub entre uma seção e a seguinte: o
 *            objeto percorre o caminho à vista, que é o pedido explícito do
 *            briefing. Nada de "some à direita, reaparece à esquerda".
 *
 * `presente` — `false` apaga o objeto nesta seção. O trajeto continua
 *            correndo por baixo, então quando ele reacende já está no ponto
 *            certo. Existe porque fio condutor sem PAUSA vira moldura: o olho
 *            para de registrar o que nunca sai de cena, e a volta no fecho
 *            deixa de valer alguma coisa.
 *
 * `canal`  — o que a tela do notebook mostra nesta seção. Ver lib/progress.js.
 */
export const sections = [
  {
    id: "manifesto",
    layout: "manifesto",
    theme: "ink",
    rays: false,
    label: "O problema",
    title: ["Ser bom não basta", "se ninguém percebe."],
    body: [
      { text: "Produto afiado, equipe certa, atendimento impecável — e uma comunicação que faz tudo isso parecer " },
      { text: "menor do que é", tone: "gold" },
      { text: ". A distância entre a empresa que você construiu e a empresa que o mercado enxerga tem um nome." },
    ],
    /** O diagnóstico em uma palavra, atravessando a tela. */
    palavra: "PERCEPÇÃO",
    laptop: { x: 1.16, y: -0.46, scale: 0.54, rotY: -1.05, rotX: 0.16 },
    canal: "social",
  },
  {
    id: "servicos",
    layout: "indice",
    theme: "ink",
    rays: true,
    label: "O que fazemos",
    title: ["A comunicação", "inteira."],
    body: [
      { text: "Não é um serviço avulso contratado por mês. São cinco frentes que se " },
      { text: "sustentam entre si", tone: "gold" },
      { text: " — e que, juntas, substituem o departamento de marketing que a sua empresa não tem." },
    ],
    laptop: { x: 1.05, y: 0.42, scale: 0.44, rotY: -0.78, rotX: 0.22 },
    canal: "social",
  },

  /* ── As cinco frentes ─────────────────────────────────────────────── */
  {
    id: "social",
    layout: "social",
    theme: "ink",
    rays: false,
    servico: "social",
    laptop: { x: 0.78, y: -0.74, scale: 0.44, rotY: -0.6, rotX: 0.14 },
    canal: "social",
  },
  {
    id: "web",
    layout: "web",
    theme: "ink",
    rays: false,
    servico: "web",
    /* O clímax do 3D: centro, de frente, tamanho real. Daqui a câmera entra
       na tela. */
    laptop: { x: 0, y: -0.16, scale: 1.12, rotY: 0, rotX: 0.03 },
    canal: "web",
  },
  {
    id: "design",
    layout: "design",
    theme: "ink",
    rays: false,
    servico: "design",
    laptop: { x: -0.98, y: -0.82, scale: 0.44, rotY: 0.9, rotX: 0.16 },
    canal: "design",
  },
  {
    id: "branding",
    layout: "branding",
    theme: "bone",
    rays: false,
    servico: "branding",
    /* Sai de cena viajando para a esquerda, não apagando. */
    laptop: { x: -1.46, y: -0.28, scale: 0.44, rotY: 1.25, rotX: 0.14 },
    /* AUSÊNCIA. A construção da marca é o palco desta seção inteira, e o
       objeto ali seria um segundo assunto disputando o mesmo bege. Ele
       continua percorrendo o trajeto por baixo — só não é desenhado. */
    presente: false,
    canal: "branding",
  },
  {
    id: "estrategia",
    layout: "estrategia",
    theme: "ink",
    rays: false,
    servico: "estrategia",
    laptop: { x: -1.35, y: 0.5, scale: 0.44, rotY: 1.2, rotX: 0.18 },
    canal: "branding",
  },

  /* ── Método, prova e fecho ────────────────────────────────────────── */
  {
    id: "metodo",
    layout: "maquina",
    theme: "ink",
    rays: false,
    label: "Como funciona",
    title: ["Entra informação.", "Sai presença."],
    body: [
      { text: "O que a sua empresa já sabe de cor entra de um lado. Do outro sai comunicação pronta para ir ao ar, " },
      { text: "toda semana", tone: "gold" },
      { text: "." },
    ],
    laptop: { x: -1.42, y: -0.56, scale: 0.44, rotY: 1.3, rotX: 0.14 },
    canal: "design",
  },
  {
    id: "porque",
    layout: "sistema",
    theme: "bone",
    rays: false,
    label: "Por que funciona",
    title: ["O que sustenta", "uma marca."],
    body: [
      { text: "Passe o cursor pelo campo e escolha uma força. O que acontece com as peças é o que acontece com a comunicação de uma empresa quando " },
      { text: "falta aquela força", tone: "gold" },
      { text: "." },
    ],
    laptop: { x: -1.44, y: 0.56, scale: 0.42, rotY: 1.3, rotX: 0.16 },
    // A segunda ausência: o campo das forças precisa da tela para ele.
    presente: false,
    canal: "prime",
  },
  {
    id: "clientes",
    layout: "clientes",
    theme: "ink",
    rays: false,
    label: "Quem confia",
    title: ["Duas marcas", "com a Prime por perto."],
    body: [
      { text: "Sem número inflado e sem logo emprestada: é o que existe " },
      { text: "de verdade", tone: "gold" },
      { text: "." },
    ],
    laptop: { x: -1.46, y: 0.34, scale: 0.42, rotY: 1.2, rotX: 0.18 },
    canal: "prime",
  },
  {
    id: "contato",
    layout: "cta",
    theme: "ink",
    rays: true,
    label: "Próximo passo",
    title: ["Sua empresa já tem", "o que mostrar."],
    body: [
      { text: "Falta ser " },
      { text: "vista", tone: "gold" },
      { text: ". Conte o que você faz — a gente volta com o caminho, sem custo e sem apresentação de trinta slides." },
    ],
    cta: { label: "Falar com a Prime", href: CONTATO.whatsapp.link },
    /* Fim da jornada: o notebook volta ao centro, aberto, encarando o leitor.
       O objeto que apresentou a experiência fecha a narrativa. */
    laptop: { x: 0, y: -0.58, scale: 0.92, rotY: 0, rotX: 0.05 },
    canal: "prime",
  },
];

/** As seções que são uma frente de serviço, na ordem em que aparecem. */
export const secoesDeServico = sections.filter((s) => s.servico);

/** Atalho: dado o id da frente, o objeto completo do serviço. */
export const servicoPorId = (id) => servicos.find((s) => s.id === id);

/* ── CLIENTES ──────────────────────────────────────────────────────────── */

/**
 * Prova social. Preenchido SÓ com o que existe de verdade no projeto.
 *
 * Campos em `null` são buracos honestos, não placeholders para exibir: o
 * componente simplesmente não desenha o que não tem. Inventar frente atendida,
 * número ou depoimento seria fabricar prova — e prova fabricada é exatamente
 * o oposto do que esta página vende.
 *
 * `instagram` é o link REAL do perfil. O preview mostrado na página é uma
 * INTERPRETAÇÃO editorial construída com os assets do projeto, e não um
 * embed: o iframe do Instagram é bloqueável e quebraria a seção inteira.
 *
 * Para completar, largue os arquivos em `public/clientes/` e preencha:
 *   placa      — true se a marca for escura e precisar de fundo claro.
 *                `node scripts/trim-clientes.mjs` mede e diz qual é o caso.
 *   frentes    — só o que a Prime realmente fez para ele
 *   depoimento — { texto, autor } só se a pessoa tiver dito de fato
 */
export const clientes = [
  {
    id: "real-pisos",
    // Lido da própria arte da logo, não inventado.
    nome: "Real Pisos",
    arroba: "@realpisos",
    instagram: "https://www.instagram.com/realpisos/",
    logo: "/clientes/cliente-1-aparada.png",
    // A marca já é clara: sobre placa branca, o nome dela desapareceria.
    placa: false,
    /* Posição no arco, em graus. -90 é o topo do círculo. */
    angulo: -132,
    frentes: [],
    depoimento: null,
  },
  {
    id: "wanderson-carvalho",
    nome: "Wanderson Carvalho",
    arroba: "@fisiowandersoncarvalho",
    instagram: "https://www.instagram.com/fisiowandersoncarvalho/",
    logo: "/clientes/cliente-2-aparada.png",
    // Tinta escura sobre papel: precisa da placa clara para existir no preto.
    placa: true,
    angulo: -48,
    frentes: [],
    depoimento: null,
  },
];

/**
 * CASES — vazio de propósito.
 *
 * A seção de portfólio só existe quando houver trabalho REAL da Prime para
 * mostrar. Inventar cliente, print ou número seria fabricar prova.
 */
export const cases = [];

/** Navegação: derivada das seções, para não existirem duas listas. */
export const navItems = [
  { id: "servicos", label: "O que fazemos" },
  { id: "web", label: "Web" },
  { id: "metodo", label: "Como funciona" },
  { id: "clientes", label: "Quem confia" },
];

export const navCta = sections.find((s) => s.layout === "cta");
