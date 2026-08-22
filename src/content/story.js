/**
 * Conteúdo e ritmo da narrativa. Fonte única de verdade: altura do trilho,
 * marcos da timeline, temas e markup das seções derivam daqui.
 *
 * POSICIONAMENTO
 * A Prime não é "uma agência que faz posts". Ela é o braço de comunicação da
 * empresa cliente: a empresa cuida do negócio, a Prime cuida de como esse
 * negócio é visto, lembrado e procurado.
 *
 * A narrativa segue essa lógica, nesta ordem:
 *   1. diagnóstico  — o problema existe e é do leitor
 *   2. serviços     — a extensão do que a Prime assume
 *   3. audiovisual  — capacidade demonstrada, não prometida
 *   4. sistema      — como as frentes se conectam
 *   5. prova        — por que funciona
 *   6. contato      — o próximo passo
 *
 * RITMO
 * Nem toda seção é um WOW. Alterna impacto e respiro: escuro e claro,
 * conduzido pelo scroll e lido no tempo do leitor, denso e arejado.
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

/* ── SERVIÇOS ──────────────────────────────────────────────────────────── */

/**
 * Cada frente tem uma LINGUAGEM VISUAL própria, desenhada em
 * components/ServiceStage.jsx: não dizer o que a Prime faz, e sim mostrar —
 * o feed se montando, a timeline cortando, o grid se organizando.
 *
 * `entregas` é a lista concreta. É ela que tira a seção do abstrato e responde
 * à pergunta que o empresário realmente tem: "isso inclui o quê?".
 */
export const servicos = [
  {
    id: "social",
    numero: "01",
    nome: "Social",
    linha: "O perfil que sustenta a reputação.",
    entregas: [
      "Gestão de Instagram",
      "Planejamento e calendário",
      "Posts e carrosséis",
      "Reels",
      "Legendas e direção de conteúdo",
      "Acompanhamento diário",
    ],
  },
  {
    id: "audiovisual",
    numero: "02",
    nome: "Audiovisual",
    linha: "Câmera na mão, direção na cabeça.",
    entregas: [
      "Captação profissional",
      "Vídeo institucional",
      "Reels e campanhas",
      "Cobertura de evento",
      "Edição e motion",
      "Tratamento de cor",
    ],
  },
  {
    id: "design",
    numero: "03",
    nome: "Design",
    linha: "Nada aqui sai de template.",
    entregas: [
      "Posts sob medida",
      "Carrosséis",
      "Campanhas",
      "Material publicitário",
      "Apresentações",
      "Aplicação de identidade",
    ],
  },
  {
    id: "branding",
    numero: "04",
    nome: "Branding",
    linha: "A marca antes da arte.",
    entregas: [
      "Criação de marca",
      "Identidade visual",
      "Paleta e tipografia",
      "Direção visual",
      "Reposicionamento",
      "Padronização",
    ],
  },
  {
    id: "web",
    numero: "05",
    nome: "Web",
    linha: "O endereço onde a marca mora.",
    entregas: [
      "Sites",
      "Landing pages",
      "Páginas de campanha",
      "Interfaces",
      "Experiências digitais",
      "Apresentações digitais",
    ],
  },
  {
    id: "estrategia",
    numero: "06",
    nome: "Estratégia",
    linha: "A decisão que vem antes de tudo.",
    entregas: [
      "Posicionamento",
      "Plano de comunicação",
      "Campanhas",
      "Direção criativa",
      "Estratégia de conteúdo",
      "Calendário anual",
    ],
  },
];

/* ── SISTEMA ───────────────────────────────────────────────────────────── */

/**
 * Os quatro estados da composição presa da seção "sistema". Não são etapas de
 * um processo em cards: são momentos de uma mesma cena se organizando,
 * conduzidos pelo scroll.
 */
export const estadosDoSistema = [
  {
    id: "solto",
    titulo: "Hoje, solto",
    texto: "Um post aqui, um vídeo ali, um flyer que alguém fez. Cada peça fala uma língua.",
  },
  {
    id: "alinhado",
    titulo: "Primeiro, alinhar",
    texto: "Entendemos o negócio e definimos o que a marca defende. As peças param de brigar.",
  },
  {
    id: "identidade",
    titulo: "Depois, a marca",
    texto: "Uma identidade atravessa tudo: a mesma cor, a mesma voz, o mesmo padrão.",
  },
  {
    id: "sistema",
    titulo: "Enfim, sistema",
    texto: "Todas as frentes passam a alimentar a mesma empresa — e a rodar sem parar.",
  },
];

/* ── SEÇÕES ────────────────────────────────────────────────────────────── */

/**
 * `theme`  — "ink" (preto, deixa passar a luz e o 3D) ou "bone" (bege opaco,
 *            que corta a cena e devolve respiro à leitura).
 * `rays`   — liga a luz dourada. Alternar é o que mantém o efeito raro.
 * `laptop` — pose do modelo 3D quando a seção está em cena, ou `null` quando
 *            a seção tem palco próprio e o modelo deve sair de cena.
 *            x e y de -1 a 1: (-1,-1) é o canto inferior esquerdo da tela,
 *            (1,1) o superior direito. Acima de 1 o modelo espia por fora.
 *            Regra: nunca invadir a coluna de texto.
 */
export const sections = [
  {
    id: "diagnostico",
    layout: "diagnostico",
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
    laptop: { x: 0.68, y: -0.5, scale: 0.68, rotY: -0.95, rotX: 0.2 },
  },
  {
    id: "servicos",
    layout: "servicos",
    theme: "ink",
    // Sem raios: o vídeo real de cada frente é o visual da seção, e a luz
    // dourada por trás só disputaria atenção com ele.
    rays: false,
    label: "O que a Prime faz",
    title: ["A Prime faz."],
    body: [
      { text: "Você toca o negócio. A gente toca a comunicação " },
      { text: "inteira", tone: "gold" },
      { text: " — da estratégia ao post publicado." },
    ],
    laptop: null,
  },
  {
    id: "digital",
    layout: "digital",
    theme: "ink",
    rays: false,
    label: "Web",
    title: ["Sua vitrine", "nunca fecha."],
    body: [
      { text: "Do endereço ao último pixel. E a " },
      { text: "prova", tone: "gold" },
      { text: " é esta página." },
    ],
    /* Entram um a um durante a sequência do computador: a tela vazia à
       direita já estava ocupada pelo notebook, e o argumento precisava de
       um lugar próprio. */
    razoes: [
      {
        chave: "24h",
        titulo: "Não fecha às 18h",
        texto: "O cliente pesquisa de madrugada, no fim de semana, no meio de uma reunião. O site atende sempre.",
      },
      {
        chave: "seu",
        titulo: "É o único canal que é seu",
        texto: "Rede social muda regra, corta alcance e some. O endereço é da empresa e ninguém tira.",
      },
      {
        chave: "compara",
        titulo: "Decide se te procuram ou te comparam",
        texto: "Em segundos o visitante conclui o seu tamanho. Um site amador desfaz uma reputação construída em anos.",
      },
    ],
    laptop: null,
  },
  {
    id: "audiovisual",
    layout: "filme",
    theme: "ink",
    rays: false,
    label: "Produção",
    title: ["A câmera", "também vende."],
    // Filmagem real da Prime. O vídeo de pó da hero é textura; aqui, o que
    // precisa aparecer é o trabalho.
    video: "audiovisual",
    body: [
      { text: "Captação, direção, edição e motion — do reel de quinze segundos ao institucional que " },
      { text: "abre porta", tone: "gold" },
      { text: "." },
    ],
    laptop: null,
  },
  {
    id: "sistema",
    layout: "sistema",
    theme: "ink",
    rays: false,
    label: "Como funciona",
    title: ["Sua empresa", "no centro."],
    body: [
      { text: "Não é uma lista de serviços avulsos. É um " },
      { text: "sistema", tone: "gold" },
      { text: ": cada frente alimenta a outra, e todas alimentam a sua marca." },
    ],
    laptop: null,
  },
  {
    id: "clientes",
    layout: "clientes",
    theme: "ink",
    rays: false,
    label: "Quem confia",
    title: ["Quem já tem", "a Prime por perto."],
    body: [
      { text: "Duas marcas que decidiram não deixar a comunicação " },
      { text: "para depois", tone: "gold" },
      { text: ". Passe o cursor para ver cada uma." },
    ],
    laptop: null,
  },
  {
    id: "prova",
    layout: "prova",
    theme: "bone",
    rays: false,
    label: "Por que funciona",
    title: ["Um time só.", "Uma direção só."],
    body: [
      { text: "Marca, vídeo, conteúdo e site saindo do mesmo lugar. É o que faz a comunicação " },
      { text: "parecer inteira", tone: "gold" },
      { text: " — e não uma colcha de fornecedores." },
    ],
    items: [
      {
        name: "Uma direção criativa",
        text: "O mesmo olhar decide a marca, o post e o vídeo. Nada sai do tom.",
      },
      {
        name: "Sem intermediário",
        text: "Quem planeja é quem grava e quem edita. O briefing não se perde no caminho.",
      },
      {
        name: "Ritmo, não campanha solta",
        text: "Comunicação é constância. A conta não para entre um projeto e outro.",
      },
      {
        name: "Do tamanho certo",
        text: "A marca precisa parecer do tamanho que a empresa já é. Nem menor, nem inflada.",
      },
    ],
    laptop: { x: -1.06, y: -0.06, scale: 0.58, rotY: 1.3, rotX: 0.18 },
  },
  {
    id: "contato",
    layout: "cta",
    theme: "ink",
    rays: true,
    label: "Próximo passo",
    title: ["Sua empresa já tem", "o que vender."],
    body: [
      { text: "Agora precisa ser " },
      { text: "vista", tone: "gold" },
      { text: ". Conte o que você faz — a gente volta com o caminho." },
    ],
    cta: { label: "Começar uma conversa", href: "mailto:contato@agenciaprime.com.br" },
    /** Fim da jornada: o laptop para de frente, aberto, encarando o leitor. */
    laptop: { x: 0, y: -0.78, scale: 0.95, rotY: 0, rotX: 0.05 },
  },
];

/* ── CLIENTES ──────────────────────────────────────────────────────────── */

/**
 * Prova social. Preenchido SÓ com o que existe de verdade no projeto.
 *
 * Campos em `null` são buracos honestos, não placeholders para exibir: o
 * componente simplesmente não desenha o que não tem. Inventar nome de cliente,
 * frente atendida ou depoimento seria fabricar prova — e prova fabricada é
 * exatamente o oposto do que esta página vende.
 *
 * Para completar, largue os arquivos em `public/clientes/` e preencha aqui:
 *   nome       — como o cliente se chama
 *   placa      — true se a marca for escura e precisar de fundo claro.
 *                `node scripts/trim-clientes.mjs` mede e diz qual é o caso.
 *   video      — "/clientes/cliente-1.mp4" (mudo, em loop, entra no hover)
 *   poster     — primeiro quadro do vídeo
 *   frentes    — só o que a Prime realmente fez para ele
 *   depoimento — { texto, autor } só se a pessoa tiver dito de fato
 *
 * Com um cliente, a seção vira um destaque único. Com dois ou mais, ela vira
 * a disputa lado a lado: quem é apontado toma a tela.
 */
export const clientes = [
  {
    id: "real-pisos",
    // Lido da própria arte da logo, não inventado.
    nome: "Real Pisos",
    logo: "/clientes/cliente-1-aparada.png",
    // A marca já é clara: sobre placa branca, o nome dela desapareceria.
    placa: false,
    video: null,
    poster: null,
    frentes: [],
    depoimento: null,
  },
  {
    id: "wanderson-carvalho",
    nome: "Wanderson Carvalho",
    logo: "/clientes/cliente-2-aparada.png",
    // Tinta escura sobre papel: precisa da placa clara para existir no preto.
    placa: true,
    video: null,
    poster: null,
    frentes: [],
    depoimento: null,
  },
];

/**
 * CASES — vazio de propósito.
 *
 * A seção de portfólio só existe quando houver trabalho REAL da Prime para
 * mostrar. Inventar cliente, print ou número seria fabricar prova — e prova
 * fabricada é exatamente o oposto do que esta página vende.
 *
 * Para ligar a seção, preencha com peças reais no formato:
 *   { id, cliente, frente: "social" | "audiovisual" | …, capa: "/cases/x.jpg",
 *     video?: "/cases/x.mp4", titulo, resumo }
 * e acrescente a seção correspondente em `sections`.
 */
export const cases = [];

/** Navegação: derivada das seções, para não existirem duas listas. */
export const navItems = [
  sections.find((s) => s.id === "servicos"),
  sections.find((s) => s.id === "digital"),
  sections.find((s) => s.id === "sistema"),
  sections.find((s) => s.id === "clientes"),
].map(({ id, label }) => ({ id, label }));

export const navCta = sections.find((s) => s.layout === "cta");
