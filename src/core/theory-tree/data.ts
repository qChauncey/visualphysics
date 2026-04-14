// ── Theory Tree Data ───────────────────────────────────────────────────────
// Historical physics milestones, categorised by discipline.
// Each node carries optional links to interactive modules.

export type Category =
  | 'classical'
  | 'electro'
  | 'thermo'
  | 'quantum'
  | 'relativity'
  | 'unified'

export interface TheoryNode {
  id:          string
  year:        number
  title:       string
  titleEn:     string
  person:      string           // key figure(s)
  category:    Category
  description: string
  descEn:      string
  module?:     string           // linked module id
  influences:  string[]         // ids of nodes this directly influenced
}

export const NODES: TheoryNode[] = [
  // ── Classical Mechanics ────────────────────────────────────────────────
  {
    id: 'newton',
    year: 1687,
    title: '经典力学',
    titleEn: 'Classical Mechanics',
    person: 'Newton',
    category: 'classical',
    description: '《自然哲学的数学原理》奠定运动三定律与万有引力定律，统一天上与地上的力学。',
    descEn: 'Principia Mathematica — three laws of motion and universal gravitation, unifying celestial and terrestrial mechanics.',
    influences: ['chaos', 'lagrange', 'em'],
  },
  {
    id: 'lagrange',
    year: 1788,
    title: '分析力学',
    titleEn: 'Analytical Mechanics',
    person: 'Lagrange · Hamilton',
    category: 'classical',
    description: '拉格朗日力学与哈密顿力学以广义坐标重新表述经典力学，为量子力学埋下形式框架。',
    descEn: 'Lagrangian and Hamiltonian reformulations of classical mechanics — the formal backbone that would underpin quantum theory.',
    influences: ['chaos', 'qm'],
  },
  {
    id: 'chaos',
    year: 1890,
    title: '混沌动力学',
    titleEn: 'Chaos Theory',
    person: 'Poincaré',
    category: 'classical',
    description: '庞加莱在研究三体问题时发现确定性系统的不可预测行为，奠定混沌理论基础。',
    descEn: 'Poincaré discovers unpredictable behaviour in deterministic systems while studying the three-body problem.',
    module: 'double-pendulum',
    influences: [],
  },

  // ── Thermodynamics & Statistical ──────────────────────────────────────
  {
    id: 'thermo',
    year: 1850,
    title: '热力学定律',
    titleEn: 'Laws of Thermodynamics',
    person: 'Clausius · Kelvin',
    category: 'thermo',
    description: '热力学第一、第二定律确立能量守恒与熵增原理，引发对统计本质的追问。',
    descEn: 'First and second laws of thermodynamics establish energy conservation and the increase of entropy.',
    influences: ['stat-mech', 'qm-origins'],
  },
  {
    id: 'stat-mech',
    year: 1877,
    title: '统计力学',
    titleEn: 'Statistical Mechanics',
    person: 'Boltzmann · Gibbs',
    category: 'thermo',
    description: '玻尔兹曼将热力学与概率结合，给出熵的微观定义 S = k ln Ω，开创统计物理。',
    descEn: 'Boltzmann connects thermodynamics with probability, defining entropy as S = k ln Ω.',
    influences: ['qm-origins'],
  },

  // ── Electromagnetism ──────────────────────────────────────────────────
  {
    id: 'em',
    year: 1865,
    title: '麦克斯韦方程组',
    titleEn: 'Maxwell\'s Equations',
    person: 'Maxwell',
    category: 'electro',
    description: '四个方程统一电、磁与光，预言电磁波并揭示光的电磁本质。',
    descEn: 'Four equations unify electricity, magnetism, and light — predicting electromagnetic waves.',
    influences: ['sr', 'qm-origins'],
  },

  // ── Quantum Origins ───────────────────────────────────────────────────
  {
    id: 'qm-origins',
    year: 1900,
    title: '量子假说',
    titleEn: 'Quantum Hypothesis',
    person: 'Planck · Einstein',
    category: 'quantum',
    description: '普朗克引入能量量子化解决黑体辐射，爱因斯坦用光子解释光电效应，量子时代开启。',
    descEn: 'Planck introduces energy quantisation for blackbody radiation; Einstein explains the photoelectric effect with photons.',
    influences: ['bohr', 'qm'],
  },
  {
    id: 'bohr',
    year: 1913,
    title: '玻尔原子模型',
    titleEn: 'Bohr Atom',
    person: 'Bohr',
    category: 'quantum',
    description: '电子只能在特定轨道上运动，原子只在跃迁时吸收或放出特定频率的光子。',
    descEn: 'Electrons occupy only discrete orbits; atoms absorb or emit photons only at specific transition frequencies.',
    module: 'hydrogen-orbital',
    influences: ['qm'],
  },
  {
    id: 'qm',
    year: 1926,
    title: '量子力学',
    titleEn: 'Quantum Mechanics',
    person: 'Heisenberg · Schrödinger · Born',
    category: 'quantum',
    description: '矩阵力学与波动力学描述微观世界——波函数、测不准原理、概率诠释。',
    descEn: 'Matrix mechanics and wave mechanics describe the microscopic world — wavefunctions, uncertainty principle, probabilistic interpretation.',
    module: 'hydrogen-orbital',
    influences: ['double-slit-exp', 'dirac', 'qft'],
  },
  {
    id: 'double-slit-exp',
    year: 1927,
    title: '双缝实验',
    titleEn: 'Double-Slit Experiment',
    person: 'Davisson · Germer · von Neumann',
    category: 'quantum',
    description: '电子通过双缝产生干涉条纹，观测导致波函数坍缩——量子力学最直观的佯谬。',
    descEn: 'Electrons create interference patterns through double slits; observation collapses the wavefunction — the most vivid quantum paradox.',
    module: 'double-slit',
    influences: ['qft'],
  },
  {
    id: 'dirac',
    year: 1928,
    title: 'Dirac 方程',
    titleEn: 'Dirac Equation',
    person: 'Dirac',
    category: 'quantum',
    description: '相对论量子方程自然预言反物质与电子自旋，是量子场论的先驱。',
    descEn: 'Relativistic quantum equation naturally predicts antimatter and electron spin — the precursor to quantum field theory.',
    influences: ['qft'],
  },

  // ── Relativity ────────────────────────────────────────────────────────
  {
    id: 'sr',
    year: 1905,
    title: '狭义相对论',
    titleEn: 'Special Relativity',
    person: 'Einstein',
    category: 'relativity',
    description: '光速不变原理推翻绝对时空观，揭示时间膨胀、长度收缩与质能等价 E = mc²。',
    descEn: 'The invariance of the speed of light dismantles absolute space and time, revealing time dilation, length contraction, and E = mc².',
    influences: ['gr', 'dirac'],
  },
  {
    id: 'gr',
    year: 1915,
    title: '广义相对论',
    titleEn: 'General Relativity',
    person: 'Einstein',
    category: 'relativity',
    description: '质量弯曲时空，时空曲率决定物质运动——引力不是力，而是时空几何。',
    descEn: 'Mass curves spacetime; curvature governs how matter moves — gravity is not a force but the geometry of spacetime.',
    module: 'spacetime-curvature',
    influences: ['cosmology', 'bh', 'lqg', 'string'],
  },
  {
    id: 'cosmology',
    year: 1929,
    title: '宇宙膨胀',
    titleEn: 'Expanding Universe',
    person: 'Hubble · Lemaître',
    category: 'relativity',
    description: '哈勃观测到星系退行速度正比于距离，宇宙正在膨胀，追溯至大爆炸奇点。',
    descEn: 'Hubble observes galaxies receding at speeds proportional to distance — the universe is expanding, traceable to a Big Bang singularity.',
    module: 'space-scale',
    influences: ['inflation'],
  },
  {
    id: 'bh',
    year: 1965,
    title: '黑洞奇点定理',
    titleEn: 'Black Hole Singularity',
    person: 'Penrose · Hawking',
    category: 'relativity',
    description: '彭罗斯与霍金证明广义相对论在黑洞与大爆炸处必然产生奇点，引发量子引力需求。',
    descEn: 'Penrose and Hawking prove that singularities are inevitable in general relativity — motivating the search for quantum gravity.',
    influences: ['lqg', 'holography'],
  },
  {
    id: 'inflation',
    year: 1980,
    title: '暴胀理论',
    titleEn: 'Inflation Theory',
    person: 'Guth · Linde',
    category: 'relativity',
    description: '宇宙在大爆炸后极短时间内经历指数膨胀，解释宇宙均匀性与大尺度结构的起源。',
    descEn: 'The universe underwent exponential expansion shortly after the Big Bang, explaining its uniformity and large-scale structure.',
    influences: [],
  },

  // ── Unified / Quantum Field Theory ────────────────────────────────────
  {
    id: 'qft',
    year: 1948,
    title: '量子电动力学',
    titleEn: 'Quantum Electrodynamics',
    person: 'Feynman · Schwinger · Tomonaga',
    category: 'unified',
    description: 'QED 以场量子化描述光与物质的相互作用，精确度是人类历史上最高的物理理论。',
    descEn: 'QED describes light–matter interaction via field quantisation — the most precisely tested theory in physics.',
    influences: ['standard-model'],
  },
  {
    id: 'standard-model',
    year: 1973,
    title: '标准模型',
    titleEn: 'Standard Model',
    person: 'Glashow · Salam · Weinberg',
    category: 'unified',
    description: '将电弱统一理论与量子色动力学合并，描述已知所有基本粒子与三种基本力。',
    descEn: 'Electroweak unification merged with QCD — describes all known fundamental particles and three of the four fundamental forces.',
    influences: ['string', 'lqg'],
  },
  {
    id: 'string',
    year: 1985,
    title: '弦理论',
    titleEn: 'String Theory',
    person: 'Schwarz · Green · Witten',
    category: 'unified',
    description: '用一维弦取代点粒子，在十维时空中统一量子力学与引力，额外维度卷缩为 Calabi-Yau 流形。',
    descEn: 'Replaces point particles with 1D strings in 10-dimensional spacetime, unifying QM and gravity; extra dimensions compactify as Calabi-Yau manifolds.',
    module: 'calabi-yau',
    influences: ['mtheory', 'holography'],
  },
  {
    id: 'lqg',
    year: 1987,
    title: '圈量子引力',
    titleEn: 'Loop Quantum Gravity',
    person: 'Ashtekar · Rovelli · Smolin',
    category: 'unified',
    description: '将时空本身量子化为离散的自旋网络，不需要额外维度即可量子化引力。',
    descEn: 'Quantises spacetime itself as discrete spin networks — a background-independent approach to quantum gravity without extra dimensions.',
    influences: [],
  },
  {
    id: 'mtheory',
    year: 1995,
    title: 'M 理论',
    titleEn: 'M-Theory',
    person: 'Witten',
    category: 'unified',
    description: '五种弦理论在十一维时空中统一为 M 理论，其基本对象是二维膜（M2）与五维膜（M5）。',
    descEn: 'Five string theories unified in 11-dimensional spacetime; fundamental objects are M2- and M5-branes.',
    influences: ['holography'],
  },
  {
    id: 'holography',
    year: 1997,
    title: 'AdS/CFT 对应',
    titleEn: 'AdS/CFT Correspondence',
    person: 'Maldacena',
    category: 'unified',
    description: 'D+1 维引力理论等价于 D 维边界上的共形场论——全息原理最精确的数学实现。',
    descEn: 'A (D+1)-dimensional gravity theory is dual to a D-dimensional conformal field theory on its boundary — the precise realisation of holography.',
    influences: [],
  },
]

// Fast lookup
export const NODE_MAP: Record<string, TheoryNode> = Object.fromEntries(NODES.map((n) => [n.id, n]))

// Category display config
export const CAT_CONFIG: Record<Category, { label: string; labelEn: string; color: string; lane: number }> = {
  classical:  { label: '经典力学',   labelEn: 'Classical',      color: '#7eb8e8', lane: 0 },
  thermo:     { label: '热力学',     labelEn: 'Thermo',         color: '#78d9a8', lane: 1 },
  electro:    { label: '电磁学',     labelEn: 'Electro',        color: '#e8c55a', lane: 2 },
  quantum:    { label: '量子力学',   labelEn: 'Quantum',        color: '#b08af0', lane: 3 },
  relativity: { label: '相对论',     labelEn: 'Relativity',     color: '#f07878', lane: 4 },
  unified:    { label: '统一理论',   labelEn: 'Unified',        color: '#c8955a', lane: 5 },
}
