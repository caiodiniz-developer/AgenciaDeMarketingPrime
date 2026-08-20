/**
 * Conteúdo e ritmo da narrativa. Fonte única de verdade: altura do trilho,
 * marcos da timeline, temas e markup das seções derivam daqui.
 *
 * A HERO é a sequência dirigida pelo scroll (vídeo + GodRays).
 * As SEÇÕES vêm depois dela, em fluxo normal — acrescentar uma seção é
 * acrescentar um objeto neste arquivo.
 */

/* ── HERO ──────────────────────────────────────────────────────────────── */

export const HERO = {
  wordmark: "AGÊNCIA PRIME",
  tagline: "Onde ideias se tornam presença.",
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

/* ── SEÇÕES ────────────────────────────────────────────────────────────── */

/**
 * `theme`  — "ink" (preto, deixa passar a luz e o 3D) ou "bone" (bege opaco,
 *            que corta a cena e devolve respiro à leitura).
 * `rays`   — liga a luz dourada. Só faz sentido no tema escuro, e alternar
 *            é o que mantém o efeito raro o bastante para valer.
 * `laptop` — pose do modelo 3D quando a seção está em cena.
 */
export const sections = [
  {
    id: "visao",
    layout: "split",
    theme: "ink",
    rays: false,
    label: "A visão",
    title: ["Mais que", "uma marca."],
    body: [
      { text: "Criamos experiências que transformam ideias em " },
      { text: "presença", tone: "gold" },
      { text: ", conectando " },
      { text: "estratégia", tone: "bright" },
      { text: ", " },
      { text: "criatividade", tone: "bright" },
      { text: " e " },
      { text: "impacto", tone: "bright" },
      { text: "." },
    ],
    laptop: { x: 0.6, y: 0.24, scale: 0.78, rotY: -0.9, rotX: 0.18 },
  },
  {
    id: "oficio",
    layout: "grid",
    theme: "ink",
    rays: true,
    label: "O que fazemos",
    title: ["Design que", "sustenta decisões."],
    body: [
      { text: "Cada escolha visual carrega uma intenção de negócio. Nada aqui é " },
      { text: "decoração", tone: "gold" },
      { text: "." },
    ],
    items: [
      {
        name: "Estratégia",
        text: "Antes da estética, a direção. Definimos o território em que a marca compete — e vence.",
      },
      {
        name: "Identidade",
        text: "Um sistema visual coerente do primeiro traço ao último pixel, pronto para escalar.",
      },
      {
        name: "Experiência",
        text: "Interfaces que conduzem em vez de explicar. O usuário entende sem precisar pensar.",
      },
    ],
    laptop: { x: 0.56, y: 0.3, scale: 0.72, rotY: 0.75, rotX: 0.12 },
  },
  {
    id: "pilares",
    layout: "glyphs",
    theme: "bone",
    rays: false,
    label: "O que sustenta",
    title: ["Quatro pilares,", "uma direção."],
    body: [
      { text: "Nenhum deles funciona sozinho. É a " },
      { text: "combinação", tone: "gold" },
      { text: " que sustenta uma marca de pé no tempo." },
    ],
    items: [
      { mark: "estrategia", name: "Estratégia", text: "Decidir onde jogar antes de decidir como aparecer." },
      { mark: "identidade", name: "Identidade", text: "Um sistema que se reconhece mesmo fora de contexto." },
      { mark: "experiencia", name: "Experiência", text: "O que a marca faz o outro sentir em cada contato." },
      { mark: "inovacao", name: "Inovação", text: "Encontrar o caminho novo quando o óbvio já saturou." },
    ],
    laptop: { x: 0.92, y: 0.04, scale: 0.6, rotY: -1.25, rotX: 0.2 },
  },
  {
    id: "metodo",
    layout: "steps",
    theme: "ink",
    rays: false,
    label: "Como trabalhamos",
    title: ["Método,", "não improviso."],
    body: [
      { text: "Um processo curto e direto, sem etapas decorativas — do primeiro diagnóstico ao " },
      { text: "lançamento", tone: "gold" },
      { text: "." },
    ],
    items: [
      { name: "Imersão", text: "Entender o negócio antes de desenhar qualquer coisa." },
      { name: "Direção", text: "Definir o território visual e o que a marca vai defender." },
      { name: "Construção", text: "Executar com precisão, no detalhe que ninguém vê e todos sentem." },
      { name: "Presença", text: "Colocar no mundo e acompanhar o que mudou." },
    ],
    laptop: { x: 0.6, y: 0.08, scale: 0.85, rotY: -0.45, rotX: -0.06 },
  },
  {
    id: "manifesto",
    layout: "statement",
    theme: "ink",
    rays: true,
    label: "No que acreditamos",
    title: ["Presença não", "se compra."],
    body: [
      { text: "Ela se constrói — em decisões consistentes, repetidas por tempo suficiente para virar " },
      { text: "reputação", tone: "gold" },
      { text: "." },
    ],
    laptop: { x: 0.5, y: -0.14, scale: 0.95, rotY: 1.05, rotX: -0.12 },
  },
  {
    id: "entrega",
    layout: "list",
    theme: "bone",
    rays: false,
    label: "O que você recebe",
    title: ["Entregas", "com nome e prazo."],
    body: [
      { text: "Nada de escopo vago. Você sabe exatamente o que chega — e " },
      { text: "quando", tone: "gold" },
      { text: "." },
    ],
    items: [
      { name: "Territórios de marca", text: "Posicionamento, discurso e o que a marca defende." },
      { name: "Sistema visual", text: "Marca, tipografia, cor, grid e regras de aplicação." },
      { name: "Interface", text: "Telas, componentes e protótipo navegável." },
      { name: "Manual vivo", text: "Documentação que o time consegue usar sem você por perto." },
    ],
    laptop: { x: -0.92, y: 0.02, scale: 0.58, rotY: 1.3, rotX: 0.18 },
  },
  {
    id: "contato",
    layout: "cta",
    theme: "ink",
    rays: true,
    label: "Vamos conversar",
    title: ["Sua presença", "começa aqui."],
    body: [
      { text: "Vamos construir a percepção que o mercado terá da sua marca. " },
      { text: "Comece agora", tone: "gold" },
      { text: "." },
    ],
    cta: { label: "Iniciar conversa", href: "mailto:contato@agenciaprime.com.br" },
    /** Fim da jornada: o laptop para de frente, aberto, encarando o leitor. */
    laptop: { x: 0, y: -0.44, scale: 1.05, rotY: 0, rotX: 0.06 },
  },
];

/** Navegação: derivada das seções, para não existirem duas listas. */
export const navItems = [
  sections.find((s) => s.id === "visao"),
  sections.find((s) => s.id === "oficio"),
  sections.find((s) => s.id === "metodo"),
  sections.find((s) => s.id === "entrega"),
].map(({ id, label }) => ({ id, label }));

export const navCta = sections.find((s) => s.layout === "cta");
