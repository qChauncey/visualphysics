// ─────────────────────────────────────────────
//  Module Descriptions
//  Structured rich text for the info popup in ModuleViewer.
//  Inline glossary markup: [显示文字|term_id] links to GLOSSARY_MAP.
//  21 modules total, added in 7 batches of 3.
// ─────────────────────────────────────────────

export interface ModuleSection { zh: string; en: string }

export interface ModuleDescription {
  whatYouSee: ModuleSection
  physics:    ModuleSection
  equation?:  string
  history:    ModuleSection
}

export const MODULE_DESCRIPTIONS: Record<string, ModuleDescription> = {

  // ── Batch 1: Classical openers ────────────────────────────────────────────

  'double-pendulum': {
    whatYouSee: {
      zh: '两根通过铰链串联的摆杆在重力下自由运动，屏幕上留下两种颜色的[相空间|phase-space]轨迹。两摆从几乎相同的初始角度出发，轨迹在短时间内便完全分叉，直观展示[混沌|chaos]对初始条件的敏感性。',
      en: 'Two hinged rods swing freely under gravity, painting coloured trails — projections of their [phase-space|phase-space] trajectory — on screen. Two pendulums started from nearly identical angles diverge rapidly: a vivid demonstration of [chaos|chaos] and sensitivity to initial conditions.',
    },
    physics: {
      zh: '双摆是最简单的[混沌|chaos]系统之一。运动由[最小作用量原理|action-principle]推导出的[拉格朗日|lagrangian]方程组描述，两个耦合非线性常微分方程用[龙格–库塔法|rk4]数值积分。正的[李雅普诺夫指数|lyapunov]意味着微小的初始差异以指数速率放大，使长期预测成为不可能。',
      en: 'The double pendulum is one of the simplest [chaotic|chaos] systems. Its motion follows coupled nonlinear ODEs derived from the [principle of least action|action-principle] via [Lagrangian|lagrangian] mechanics, integrated numerically with [Runge–Kutta|rk4]. A positive [Lyapunov exponent|lyapunov] quantifies the exponential divergence of nearby trajectories.',
    },
    equation: 'λ = lim_{t→∞} (1/t) ln|δθ(t)/δθ(0)|',
    history: {
      zh: 'Henri Poincaré 在 19 世纪末研究三体问题时，首次发现确定性系统中的不可预测行为。Edward Lorenz 于 1963 年通过气象模型重新发现了混沌，他将初始条件的敏感性形象地称为"蝴蝶效应"。双摆作为混沌的教学演示器在 20 世纪 80 年代混沌理论普及期间广为人知。',
      en: 'Henri Poincaré first encountered unpredictability in deterministic systems while studying the three-body problem in the 1880s. Edward Lorenz independently rediscovered chaos in 1963 through a weather model, coining the "butterfly effect." The double pendulum became a popular chaos demonstration as the field entered mainstream science in the 1980s.',
    },
  },

  'hydrogen-orbital': {
    whatYouSee: {
      zh: '氢原子电子的概率密度分布 |ψ|² 在二维截面上以颜色深浅呈现，颜色越亮代表电子出现的概率越高。可选择不同的量子态（1s、2s、2p、3d 等），观察各轨道的节面结构与对称性。',
      en: 'The probability density |ψ|² of a hydrogen electron displayed as a colour map on a 2D cross-section — brighter means more likely to find the electron. Switch between orbitals (1s, 2s, 2p, 3d, …) to see their nodal surfaces and symmetry.',
    },
    physics: {
      zh: '氢原子的[波函数|wavefunction] ψ_{nlm}(r,θ,φ) 是薛定谔方程的精确解，由主[量子数|quantum-number] n、角量子数 l 和磁量子数 m 唯一确定，加上电子[自旋|spin]量子数 mₛ = ±1/2 共四个量子数。[泡利不相容原理|pauli-exclusion]规定每个轨道最多容纳两个[自旋|spin]相反的电子，决定了元素的壳层结构。轨道尺寸由[不确定性原理|uncertainty]设置下界：Δr·Δp ≥ ħ/2。',
      en: 'The hydrogen [wavefunction|wavefunction] ψ_{nlm}(r,θ,φ) is an exact Schrödinger solution, labelled by [quantum numbers|quantum-number] n, l, m, plus the electron [spin|spin] quantum number mₛ = ±1/2. The [Pauli exclusion principle|pauli-exclusion] allows at most two opposite-[spin|spin] electrons per orbital, dictating the periodic table shell structure. Orbital size is bounded below by the [uncertainty principle|uncertainty]: Δr·Δp ≥ ħ/2.',
    },
    equation: 'Eₙ = −13.6 eV / n²',
    history: {
      zh: '尼尔斯·玻尔于 1913 年提出半经典轨道模型，解释了氢原子谱线。薛定谔于 1926 年建立波动力学，给出氢原子波函数的严格解，完全解释了能级和选择定则。这是量子力学最重要的精确可解模型。',
      en: 'Niels Bohr proposed a semi-classical orbit model in 1913 to explain hydrogen spectral lines. Erwin Schrödinger\'s 1926 wave mechanics provided exact wavefunctions, fully explaining the energy levels and selection rules. The hydrogen atom remains the most important exactly solvable model in quantum mechanics.',
    },
  },

  'space-scale': {
    whatYouSee: {
      zh: '从亚原子尺度到可观测宇宙的连续缩放之旅。对数刻度滑块控制观察尺度，天体按相对尺寸排列，展示从质子（10⁻¹⁵ m）到宇宙网络（10²⁶ m）共 41 个数量级的跨度。',
      en: 'A continuous zoom from subatomic scales to the observable universe. A logarithmic slider controls the viewing scale, arranging bodies by relative size — spanning 41 orders of magnitude from the proton (10⁻¹⁵ m) to the cosmic web (10²⁶ m).',
    },
    physics: {
      zh: '宇宙各结构跨越的尺度范围远超人类直觉。[引力势|grav-potential]主导了行星到宇宙大尺度结构的形成，而核力主导了 10⁻¹⁵ m 尺度。宇宙加速膨胀由[暗能量|dark-energy]驱动（占总能量 68%），可观测宇宙的大小由[哈勃常数|hubble-constant]决定。对数尺度是唯一能在有限屏幕上呈现如此巨大跨度的方式。',
      en: 'The universe\'s structures span scales far beyond human intuition. [Gravitational potential|grav-potential] governs formation from planets to cosmic webs; nuclear forces dominate at 10⁻¹⁵ m. The accelerating expansion is driven by [dark energy|dark-energy] (68% of the total energy budget), and the size of the observable universe is set by the [Hubble constant|hubble-constant]. A logarithmic scale is the only way to represent this range on a finite screen.',
    },
    history: {
      zh: 'Charles and Ray Eames 于 1977 年制作的纪录片《十的次方》（Powers of Ten）是对宇宙尺度最经典的可视化之一，从人到宇宙再回到细胞核用了不到 10 分钟，深刻影响了此后的科普教育。',
      en: 'Charles and Ray Eames\' 1977 film "Powers of Ten" is the most iconic scale visualisation — journeying from a human to the edge of the universe and back to a cell nucleus in under ten minutes. It profoundly shaped how scale is taught in science education.',
    },
  },


  // ── Batch 2 ───────────────────────────────────────────────────────────────

  'double-slit': {
    whatYouSee: {
      zh: '单个[光子|photon]或电子逐一通过双缝后落在探测屏上，随着粒子数积累，[量子干涉|interference]条纹逐渐显现。可切换"观察"模式——一旦测量粒子经过哪条缝，干涉条纹便立即消失。',
      en: 'Individual [photons|photon] or electrons arrive one by one at a detector screen. As counts accumulate, [quantum interference|interference] fringes emerge from seemingly random hits. Switching to "observed" mode — which-path measurement — destroys the fringes instantly.',
    },
    physics: {
      zh: '双缝实验是[波粒二象性|wave-particle]最直接的实验证明。每个粒子以[波函数|wavefunction]形式处于经过两条缝的[叠加态|superposition]，两路振幅叠加产生[干涉|interference]图样。一旦测量粒子的路径信息，叠加态[坍缩|collapse]，干涉消失——这一过程与[退相干|decoherence]密切相关。',
      en: 'The double-slit experiment is the clearest demonstration of [wave–particle duality|wave-particle]. Each particle\'s [wavefunction|wavefunction] exists in a [superposition|superposition] of paths through both slits; the two amplitudes [interfere|interference]. Measuring which slit the particle took collapses the superposition — a process closely related to [decoherence|decoherence].',
    },
    equation: 'I(θ) = sinc²(πa sinθ/λ) · cos²(πd sinθ/λ)',
    history: {
      zh: '托马斯·杨于 1801 年用光做双缝实验，证明了光的波动性。20 世纪初，该实验被推广到电子（约翰逊、戴维孙-革末，1927），证明了物质波的存在。费曼称双缝实验是"量子力学的核心奥秘"，一切量子怪异性都蕴含其中。',
      en: 'Thomas Young performed the original double-slit experiment with light in 1801, demonstrating its wave nature. In the early 20th century, the experiment was extended to electrons (Davisson–Germer, 1927), confirming de Broglie\'s matter waves. Feynman called it "the only mystery" of quantum mechanics — every quantum strangeness is contained within it.',
    },
  },

  'spacetime-curvature': {
    whatYouSee: {
      zh: '三维网格在三个可拖拽质量球的引力势作用下产生弯曲，网格颜色从深蓝（低势）渐变为铜色（高势）。拖拽质量球可实时改变时空弯曲形态，鼠标右键拖拽可旋转三维视角。',
      en: 'A 3D grid warps under the [gravitational potential|grav-potential] of three draggable mass spheres, coloured from deep blue (deep wells) to copper (flat regions). Drag the spheres to reshape the curvature live; right-drag to orbit the 3D view.',
    },
    physics: {
      zh: '广义相对论将引力诠释为时空曲率而非力。可视化使用牛顿引力势 Φ = −ΣGMᵢ/rᵢ 近似展示质量引起的时空弯曲。网格顶点沿 y 轴的位移正比于 Φ，每个质量球的贡献叠加。[测地线|geodesic]是弯曲时空中的"直线"，物体沿其自由运动。',
      en: 'General relativity interprets gravity as spacetime curvature, not a force. This visualisation approximates the curvature using the Newtonian [gravitational potential|grav-potential] Φ = −ΣGMᵢ/rᵢ — the vertical mesh displacement is proportional to Φ. Real GR: freely falling objects follow [geodesics|geodesic] in curved 4D spacetime.',
    },
    equation: 'Gμν = 8πG/c⁴ · Tμν',
    history: {
      zh: '阿尔伯特·爱因斯坦于 1915 年发表广义相对论场方程，将引力统一为几何。1919 年日食实验证实光线在太阳引力下弯曲，使爱因斯坦一举成名。引力透镜、黑洞、引力波等预言此后相继得到验证。',
      en: 'Albert Einstein published the field equations of general relativity in 1915, reframing gravity as geometry. The 1919 solar eclipse expedition confirmed light bending, making Einstein world-famous. Subsequent confirmations include gravitational lensing, black holes, and the direct detection of [gravitational waves|grav-wave] by LIGO in 2015.',
    },
  },

  'calabi-yau': {
    whatYouSee: {
      zh: '方程 z₁ⁿ + z₂ⁿ = 1 在复数空间中的解投影到三维空间形成的曲面，用色调区分不同的复数"补丁"。可调节幂次 n（2 到 5），观察曲面拓扑结构随 n 的变化，也可拖拽旋转视角。',
      en: 'The three-dimensional projection of the complex surface z₁ⁿ + z₂ⁿ = 1, with hue distinguishing different complex "patches". Adjust the power n (2–5) to see the topology change; drag to rotate.',
    },
    physics: {
      zh: '[弦理论|string-theory]要求 10 个时空维度，其中 6 个[额外维度|extra-dims]被紧化成 [Calabi–Yau 流形|calabi-yau]。流形的拓扑结构——特别是欧拉数和霍奇数——决定低能有效场论中的粒子种类和相互作用。不同的 Calabi–Yau 流形对应"弦景观"中不同的真空。',
      en: '[String theory|string-theory] requires 10 spacetime dimensions; 6 [extra dimensions|extra-dims] are compactified on a [Calabi–Yau manifold|calabi-yau]. The manifold\'s topology — Euler number, Hodge numbers — determines the particle spectrum and interactions in the low-energy effective theory. Different manifolds correspond to different vacua in the "string landscape".',
    },
    history: {
      zh: 'Eugenio Calabi 于 1954 年猜想这类流形的存在，Shing-Tung Yau 于 1977 年证明（Yau 因此获得 1982 年菲尔兹奖）。Philip Candelas 等人在 1985 年将 Calabi–Yau 流形引入弦理论紧化方案，此后成为弦论研究的核心数学工具。',
      en: 'Eugenio Calabi conjectured the existence of these manifolds in 1954; Shing-Tung Yau proved it in 1977 (earning the 1982 Fields Medal). Philip Candelas and collaborators introduced Calabi–Yau compactification into string theory in 1985, making them central objects in theoretical physics.',
    },
  },


  // ── Batch 3 ───────────────────────────────────────────────────────────────

  'gravitational-waves': {
    whatYouSee: {
      zh: '两个天体在三维倾斜网格上绕质心旋转，随着轨道收缩，[引力波|grav-wave]以同心环向外扩散。并合时爆发最强辐射，之后涟漪逐渐衰减。拖拽可旋转三维视角。',
      en: 'Two bodies orbit their common centre on a tilted 3D grid; as the orbit shrinks, [gravitational waves|grav-wave] spread outward as expanding rings. The merger produces a burst of maximum radiation, then the ripples fade. Drag to change the 3D viewing angle.',
    },
    physics: {
      zh: '[引力波|grav-wave]是时空曲率的涟漪，由加速质量以四极辐射形式发出。辐射功率 P = −32/5 · G⁴/c⁵ · m₁²m₂²(m₁+m₂)/a⁵，导致轨道随时间螺旋收缩。并合前波形频率和振幅的快速增大称为"啁啾"，[啁啾质量|chirp-mass]可直接从观测波形提取。',
      en: '[Gravitational waves|grav-wave] are ripples in spacetime curvature emitted as quadrupole radiation by accelerating masses. The radiated power P ∝ G⁴m₁²m₂²(m₁+m₂)/c⁵a⁵ causes the orbit to spiral inward. The pre-merger frequency sweep is the "chirp"; the [chirp mass|chirp-mass] is directly extractable from the waveform.',
    },
    equation: 'h ≈ (4G/c⁴) · (d²Q/dt²) / r',
    history: {
      zh: '爱因斯坦于 1916 年预言引力波的存在，但他曾一度认为振幅太小而无法探测。1974 年赫尔斯–泰勒脉冲双星间接证实了引力波的存在（1993 年诺贝尔奖）。2015 年 9 月 14 日，LIGO 首次直接探测到双黑洞并合（GW150914），引发了引力波天文学的新时代。',
      en: 'Einstein predicted gravitational waves in 1916 but doubted they could ever be detected. The Hulse–Taylor binary pulsar indirectly confirmed their existence in 1974 (1993 Nobel Prize). On 14 September 2015, LIGO directly detected GW150914 — a merging binary black hole — opening the era of gravitational-wave astronomy.',
    },
  },

  'feynman-diagrams': {
    whatYouSee: {
      zh: '量子电动力学（QED）中电子–电子散射的[费曼图|feynman-diag]交互演示：树图（光子交换）与单圈修正图。点击不同图可高亮显示传播子和顶点，并展示对应的数学表达式。',
      en: 'Interactive [Feynman diagrams|feynman-diag] for electron–electron scattering in QED: the tree-level diagram (photon exchange) and one-loop corrections. Click a diagram to highlight propagators and vertices with their mathematical expressions.',
    },
    physics: {
      zh: '[费曼图|feynman-diag]是量子场论微扰展开的图形语言，源于费曼对[路径积分|path-integral]的图形化诠释。每条内线对应一个[传播子|propagator]，每个顶点对应一个耦合常数。内线代表[虚粒子|virtual-particle]——[费米子|fermion]用箭头线、[玻色子|boson]用波浪线表示。圈图动量积分产生紫外发散，需通过[重整化|renormalization]得到有限结果。',
      en: '[Feynman diagrams|feynman-diag] are the graphical encoding of QFT perturbation theory, arising from Feynman\'s [path-integral|path-integral] formulation. Each internal line is a [propagator|propagator]; each vertex is a coupling constant. Internal [fermion|fermion] lines carry arrows; [boson|boson] lines are wavy or dashed. Loop integrals produce ultraviolet divergences handled by [renormalization|renormalization].',
    },
    equation: 'M = (−ie)² ū(p₃)γᵘu(p₁) · (−igᵘᵛ/q²) · ū(p₄)γᵥu(p₂)',
    history: {
      zh: '理查德·费曼于 1948 年在宾斯坦学术会议上提出这套图形方法，弗里曼·戴森随后证明其等价于施温格和朝永的算符方法。费曼、施温格与朝永振一郎因 QED 的贡献共同获得 1965 年诺贝尔物理学奖。费曼图此后成为粒子物理标准模型计算的通用语言。',
      en: 'Richard Feynman introduced the diagrams at the 1948 Pocono Conference; Freeman Dyson proved their equivalence to the operator methods of Schwinger and Tomonaga. Feynman, Schwinger, and Tomonaga shared the 1965 Nobel Prize for QED. Feynman diagrams are now the universal language of particle-physics calculations.',
    },
  },

  'higgs-field': {
    whatYouSee: {
      zh: '希格斯场的"墨西哥帽"势能曲面在三维空间中旋转，标量场（铜色球）在势阱底部振荡。势垒高度和场真空期望值随参数变化，可直观观察[自发对称破缺|ssb]的发生过程。',
      en: 'The "Mexican hat" Higgs potential spins in 3D; a scalar field excitation (copper sphere) oscillates at the bottom of the well. Adjust the potential parameters to watch [spontaneous symmetry breaking|ssb] occur as the false vacuum becomes unstable.',
    },
    physics: {
      zh: '[希格斯场|higgs-mech]是标准模型中充满整个空间的标量场，其[真空期望值|vev] v ≈ 246 GeV 通过[希格斯机制|higgs-mech]打破 SU(2)×U(1) [规范对称性|gauge-symmetry]，赋予 W/Z [玻色子|boson]质量。势能 V(φ) = −μ²|φ|² + λ|φ|⁴ 的"帽沿"对应[自发对称破缺|ssb]后的真空简并。希格斯[玻色子|boson]（自旋为 0）是场在真空附近的量子化激发。',
      en: 'The [Higgs field|higgs-mech] is a scalar field whose [vacuum expectation value|vev] v ≈ 246 GeV breaks the SU(2)×U(1) [gauge symmetry|gauge-symmetry] of the electroweak theory via the [Higgs mechanism|higgs-mech], giving masses to W/Z [bosons|boson]. The potential V(φ) = −μ²|φ|² + λ|φ|⁴ produces a degenerate "brim" after [spontaneous symmetry breaking|ssb]. The Higgs [boson|boson] (spin-0) is the quantum of oscillations about the vacuum.',
    },
    equation: 'V(φ) = −μ²|φ|² + λ|φ|⁴,  ⟨φ⟩ = v = √(μ²/2λ)',
    history: {
      zh: '彼得·希格斯、弗朗索瓦·恩格勒特等人于 1964 年独立提出[希格斯机制|higgs-mech]。标准模型将其纳入后，寻找希格斯玻色子成为粒子物理学长达近 50 年的核心任务。2012 年 7 月 4 日，CERN 大型强子对撞机（LHC）的 ATLAS 和 CMS 实验宣布发现质量约 125 GeV 的希格斯玻色子，希格斯和恩格勒特因此获得 2013 年诺贝尔物理学奖。',
      en: 'Peter Higgs, François Englert, and others independently proposed the [Higgs mechanism|higgs-mech] in 1964. Finding the Higgs boson became the central mission of particle physics for nearly 50 years. On 4 July 2012, ATLAS and CMS at CERN\'s LHC announced its discovery at ≈ 125 GeV. Higgs and Englert shared the 2013 Nobel Prize in Physics.',
    },
  },


  // ── Batch 4 ───────────────────────────────────────────────────────────────

  'ising-model': {
    whatYouSee: {
      zh: '二维自旋格点上铜色（+1）与深蓝（-1）的磁畴随温度演化。在[居里温度|curie-temp]附近出现大规模涨落和分形状磁畴边界。温度低于 Tc 时，格点自发对齐形成铁磁有序态；高于 Tc 则变为无序的顺磁态。',
      en: 'A 2D lattice of spins — copper (+1) and dark blue (−1) — evolves via Metropolis Monte Carlo. Near the [Curie temperature|curie-temp] large-scale fluctuations and fractal domain boundaries emerge. Below Tc spins spontaneously align; above Tc they disorder into paramagnetism.',
    },
    physics: {
      zh: '[伊辛模型|ising]的[哈密顿量|hamiltonian] H = −J ΣᵢⱼSᵢSⱼ 描述相邻自旋的铁磁耦合。Metropolis 算法按[玻尔兹曼因子|boltzmann-factor] e^{-ΔE/kT} 接受翻转，模拟热平衡下的系综抽样。每次翻转改变系统[熵|entropy]的微观态数目。二维模型在 Tc ≈ 2.269J/k 处发生连续[相变|phase-transition]，标度指数具有普适性，与实验中许多不同系统一致。',
      en: 'The [Ising model|ising] [Hamiltonian|hamiltonian] H = −J ΣᵢⱼSᵢSⱼ captures ferromagnetic coupling. Metropolis Monte Carlo accepts spin flips with [Boltzmann factor|boltzmann-factor] e^{−ΔE/kT}, sampling the thermal equilibrium ensemble. Each flip changes the [entropy|entropy] of the system by altering the microstate count. The 2D model has an exact [phase transition|phase-transition] at Tc ≈ 2.269 J/k with universal critical exponents shared by many real systems.',
    },
    equation: 'Tc = 2J / (k ln(1+√2)) ≈ 2.269 J/k',
    history: {
      zh: '恩斯特·伊辛于 1924 年在其导师伦茨的建议下求解了一维模型，发现无相变，误以为高维亦然。拉斯·昂萨格于 1944 年给出二维伊辛模型的精确解，发现了相变——这是统计力学中最重要的精确结果之一。伊辛模型此后成为理解普适性和重整化群的标准范本。',
      en: 'Ernst Ising solved the 1D model in 1924 (at Lars Onsager\'s suggestion) and found no phase transition, wrongly concluding the same held in higher dimensions. Lars Onsager\'s exact 2D solution in 1944 revealed the phase transition — one of the most important exact results in statistical mechanics. The Ising model became the paradigm for universality and the renormalisation group.',
    },
  },

  'three-body': {
    whatYouSee: {
      zh: '三个相互引力作用的天体在二维平面上运动，各自留下不同颜色的轨迹。运动通常在短时间内转变为[混沌|chaos]，轨迹缠绕、交叉，最终导致某天体被弹射逃逸或形成不稳定的双星系统。',
      en: 'Three mutually gravitating bodies move in a 2D plane, each leaving a coloured trail. Motion quickly becomes [chaotic|chaos] — orbits intertwine and cross until one body is ejected or an unstable binary forms.',
    },
    physics: {
      zh: '三体问题没有一般解析解（庞加莱 1890 年证明）。[引力势|grav-potential] V = −Σ Gmᵢmⱼ/rᵢⱼ 导出的方程组高度非线性，在[相空间|phase-space]中表现为复杂的混沌轨迹。只有少数特殊构型（如拉格朗日三角解）是稳定的周期轨道。正的[李雅普诺夫指数|lyapunov]使预测视界通常仅数个轨道周期。',
      en: 'The three-body problem has no general closed-form solution (Poincaré, 1890). The equations derived from [gravitational potential|grav-potential] V = −Σ Gmᵢmⱼ/rᵢⱼ are strongly nonlinear; in [phase space|phase-space] they trace [chaotic|chaos] tangles. Only special configurations — e.g. Lagrange\'s equilateral triangle — are stable. Positive [Lyapunov exponents|lyapunov] limit predictions to a few orbital periods.',
    },
    equation: 'mᵢr̈ᵢ = Σⱼ≠ᵢ Gmᵢmⱼ(rⱼ−rᵢ)/|rⱼ−rᵢ|³',
    history: {
      zh: '牛顿在《原理》中首次提出三体问题，此后两个世纪众多数学家徒劳地寻找解析解。亨利·庞加莱于 1890 年证明不存在收敛的级数解，意外地发现了混沌现象。王秋棠于 1991 年发现首个稳定的"8字形"三体周期轨道，此后数百个特殊周期解相继被找到。',
      en: 'Newton posed the three-body problem in the Principia; two centuries of mathematicians sought analytic solutions in vain. Henri Poincaré proved in 1890 that no convergent series solution exists — inadvertently discovering chaos. Chenciner and Montgomery (2000) rigorously confirmed the "figure-eight" orbit, and hundreds of other periodic solutions have since been found numerically.',
    },
  },

  'schwarzschild': {
    whatYouSee: {
      zh: '史瓦西黑洞附近的光线轨迹和吸积盘可视化。光子[测地线|geodesic]在强引力场中弯曲，光线圈（r = 1.5rₛ）处出现光子球。可调整观察角度，观察相对论喷流、多普勒增亮和引力红移效应。',
      en: 'Photon [geodesics|geodesic] and an accretion disk around a Schwarzschild black hole. Rays bend dramatically near the photon sphere (r = 1.5 rₛ). Adjust viewing angle to see the relativistic jet, Doppler brightening, and gravitational redshift.',
    },
    physics: {
      zh: '史瓦西解是球对称不旋转质量的广义相对论精确解，度规为 ds² = −(1−rₛ/r)c²dt² + (1−rₛ/r)⁻¹dr² + r²dΩ²。在[史瓦西半径|schwarzschild-r] rₛ = 2GM/c² 处，时间分量为零——即[事件视界|event-horizon]。引力[时间膨胀|time-dilation]使视界处钟走无限慢（外部观测者所见）。光子球位于 r = 3GM/c²，[测地线|geodesic]在此绕圆轨道运行。',
      en: 'The Schwarzschild metric is the exact GR solution for a non-rotating spherical mass: ds² = −(1−rₛ/r)c²dt² + dr²/(1−rₛ/r) + r²dΩ². At the [Schwarzschild radius|schwarzschild-r] rₛ = 2GM/c² (the [event horizon|event-horizon]) the time component vanishes — gravitational [time dilation|time-dilation] makes a clock at the horizon tick infinitely slowly as seen from outside. The photon sphere at r = 3GM/c² is where circular [geodesics|geodesic] exist.',
    },
    equation: 'rₛ = 2GM/c²',
    history: {
      zh: '卡尔·史瓦西于 1916 年在东线战壕中推导出爱因斯坦场方程的第一个精确解，几周后因病去世。"黑洞"一词由约翰·惠勒于 1967 年推广。2019 年，事件视界望远镜（EHT）首次拍摄到 M87 星系中心超大质量黑洞的阴影图像，为黑洞的存在提供了直接视觉证据。',
      en: 'Karl Schwarzschild derived the first exact solution to Einstein\'s field equations in 1916 from the Eastern Front trenches, dying weeks later. John Wheeler popularised the term "black hole" in 1967. In 2019, the Event Horizon Telescope imaged the shadow of the supermassive black hole in M87, providing direct visual evidence.',
    },
  },


  // ── Batch 5 ───────────────────────────────────────────────────────────────

  'quantum-tunneling': {
    whatYouSee: {
      zh: '一维势垒前粒子[波函数|wavefunction]的实部、虚部与概率密度 |ψ|² 的实时演化。在势垒厚度和能量低于势垒高度时，|ψ|² 在势垒右侧仍有非零值——这正是[量子隧穿|tunneling]的直接视觉证据。',
      en: 'Real-time evolution of a particle [wavefunction|wavefunction] — Re(ψ), Im(ψ), and |ψ|² — impinging on a rectangular potential barrier. Even when the particle energy is below the barrier height, |ψ|² is nonzero on the far side: [quantum tunneling|tunneling] made visible.',
    },
    physics: {
      zh: '经典物理禁止 E < V₀ 的区域，但[不确定性原理|uncertainty] Δx·Δp ≥ ħ/2 使粒子能以[波函数|wavefunction]渗入势垒——指数衰减解 ψ ∝ e^{−κx}，κ = √(2m(V₀−E)/ℏ²)。透射系数近似为 T ≈ e^{−2κd}，[WKB 近似|wkb]给出更精确的结果。隧穿是 α 衰变、扫描隧道显微镜（STM）的核心机制。',
      en: 'Classical physics forbids E < V₀ regions, but the [uncertainty principle|uncertainty] Δx·Δp ≥ ħ/2 allows the [wavefunction|wavefunction] to penetrate — the solution decays as ψ ∝ e^{−κx} with κ = √(2m(V₀−E)/ħ²). Transmission probability T ≈ e^{−2κd}; the [WKB approximation|wkb] refines this. Tunneling underlies alpha decay and scanning tunneling microscopy (STM).',
    },
    equation: 'T ≈ exp(−2d√(2m(V₀−E)/ħ²))',
    history: {
      zh: '乔治·伽莫夫和罗纳德·格尼–爱德华·康登于 1928 年独立用隧穿效应解释了 α 衰变的半衰期。利奥·埃萨基（1958 年）发现隧道二极管，获 1973 年诺贝尔奖。格尔德·宾尼和海因里希·罗雷尔于 1981 年发明扫描隧道显微镜，利用隧穿电流以原子分辨率成像表面，共获 1986 年诺贝尔奖。',
      en: 'George Gamow and Gurney–Condon independently explained alpha decay half-lives via tunneling in 1928. Leo Esaki discovered the tunnel diode in 1958 (Nobel 1973). Gerd Binnig and Heinrich Rohrer invented the scanning tunneling microscope in 1981, using tunneling current to image surfaces with atomic resolution (Nobel 1986).',
    },
  },

  'string-worldsheet': {
    whatYouSee: {
      zh: '闭合弦在时空中传播扫出的二维[世界面|worldsheet]，参数化为 (σ, τ) 的曲面在三维投影中呈现复杂的弦模式振动。不同振动模式对应不同基本粒子，颜色编码振幅大小。',
      en: 'A closed string propagates through spacetime, sweeping out a two-dimensional [worldsheet|worldsheet] parameterised by (σ, τ). Different vibrational modes — colour-coded by amplitude — correspond to different fundamental particles.',
    },
    physics: {
      zh: '[弦理论|string-theory]用南部–後藤作用量描述弦的动力学：S = −T∫∫ d²σ √(−det g_{ab})，其中 T 为弦张力，g_{ab} 为诱导度规。弦的量子化振动模式给出无质量模式（对应引力子、规范玻色子）和大质量激发态（普朗克质量量级，实验上不可观测）。闭弦包含引力子模式是弦理论统一引力的关键。',
      en: '[String theory|string-theory] governs string dynamics via the Nambu–Goto action S = −T∫∫√(−det g_{ab}) d²σ. Quantising the string gives massless modes (graviton, gauge bosons) and massive excitations at the Planck mass (experimentally inaccessible). The appearance of a massless spin-2 mode — the graviton — in the closed string spectrum is central to string theory\'s unification programme.',
    },
    equation: 'S = −(T/2)∫d²σ √(−γ) γᵃᵇ ∂ₐXᵘ ∂ᵦXᵥ ηᵘᵥ',
    history: {
      zh: '弦理论起源于 1968 年维内奇亚诺为强子散射振幅发现的欧拉 Beta 函数公式。南部阳一郎、後藤铁郎和苏斯坎德于 1970 年代给出弦的物理解释。1984–1985 年的"第一次超弦革命"发现了五种超弦理论。胡安·马尔达塞纳 1997 年提出的 AdS/CFT 对应是弦理论最重要的现代进展之一。',
      en: 'String theory began with Veneziano\'s 1968 Euler Beta function formula for hadron scattering. Nambu, Goto, and Susskind gave the string interpretation in the early 1970s. The 1984–85 "First Superstring Revolution" identified five consistent superstring theories. Maldacena\'s 1997 AdS/CFT correspondence is the most influential modern development.',
    },
  },

  'blackbody-radiation': {
    whatYouSee: {
      zh: '不同温度下黑体辐射的谱能量密度曲线，以及对应的峰值波长随温度的移动（[维恩位移|wien]）。瑞利–金斯经典曲线在高频处发散（[紫外灾难|uv-catastrophe]），而普朗克量子曲线与实验完美吻合。可调整温度观察从微波到紫外的辐射峰值迁移。',
      en: 'Spectral energy density curves at different temperatures — showing peak wavelength shift ([Wien\'s law|wien]) and the contrast between the classical Rayleigh–Jeans curve (diverging at high frequency: the [ultraviolet catastrophe|uv-catastrophe]) and Planck\'s quantum formula which matches experiment perfectly.',
    },
    physics: {
      zh: '[普朗克定律|planck-law] B(ν,T) = 2hν³/c² · 1/(e^{hν/kT}−1) 将电磁场视为[光子|photon]气体，由[配分函数|partition-function]推导，假设每个模式的能量以 E = hν 量子化，从而避免高频发散。[维恩位移定律|wien] λ_max = b/T 给出峰值波长，斯特藩–玻尔兹曼定律 P = σT⁴ 给出总辐射功率。恒星颜色、宇宙微波背景、激光腔等都遵循[黑体|blackbody]辐射规律。',
      en: '[Planck\'s law|planck-law] B(ν,T) = 2hν³/c² / (e^{hν/kT}−1) treats the electromagnetic field as a gas of [photons|photon], derived from the [partition function|partition-function] by quantising each mode in units E = hν — avoiding the [ultraviolet catastrophe|uv-catastrophe]. [Wien\'s displacement law|wien] λ_max = b/T locates the peak; Stefan–Boltzmann P = σT⁴ gives total power. Stellar colours, the CMB, and laser cavities all follow [blackbody|blackbody] radiation.',
    },
    equation: 'B(ν,T) = 2hν³/c² · 1/(e^{hν/kT} − 1)',
    history: {
      zh: '马克斯·普朗克于 1900 年 12 月 14 日提出量子假说，拟合了黑体辐射实验曲线（此日后被称为"量子诞生日"）。普朗克最初视其为数学技巧，爱因斯坦于 1905 年在解释光电效应时赋予量子以物理实在性。这是近代物理最重要的历史转折点之一。',
      en: 'Max Planck proposed energy quantisation on 14 December 1900 to fit the blackbody curve — now celebrated as the birthday of quantum theory. Planck himself initially treated it as a mathematical trick; Einstein gave quanta physical reality in 1905 by explaining the photoelectric effect. This is one of the most consequential turning points in the history of physics.',
    },
  },


  // ── Batch 6 ───────────────────────────────────────────────────────────────

  'minkowski-diagram': {
    whatYouSee: {
      zh: '闵可夫斯基时空图展示不同惯性系中的世界线、同时面和[光锥|light-cone]。拖拽速度滑块可实时切换参考系，观察[洛伦兹变换|lorentz]如何压缩时间轴和空间轴，直观理解同时性的相对性。',
      en: 'A Minkowski spacetime diagram showing worldlines, simultaneity surfaces, and [light cones|light-cone] in different inertial frames. Drag the velocity slider to switch frames in real time and watch the [Lorentz transformation|lorentz] shear the axes — simultaneity is relative.',
    },
    physics: {
      zh: '闵可夫斯基时空将时间和空间统一为四维连续体，时空间隔 ds² = c²dt² − dx² 是[洛伦兹变换|lorentz]不变量。[光锥|light-cone]将时空划分为可因果联系的类时区域和无法因果联系的类空区域。[固有时|proper-time]τ = ∫√(1−v²/c²)dt 是运动时钟测量的时间，[时间膨胀|time-dilation]在图中表现为斜轴上间距的缩短。',
      en: 'Minkowski spacetime unifies time and space into a 4D continuum; the interval ds² = c²dt² − dx² is invariant under [Lorentz transformations|lorentz]. [Light cones|light-cone] separate causally connected (timelike) from disconnected (spacelike) regions. [Proper time|proper-time] τ = ∫√(1−v²/c²)dt is what a moving clock measures — [time dilation|time-dilation] is visible as compressed tick-marks on the boosted worldline.',
    },
    equation: 'ds² = c²dτ² = c²dt² − dx² − dy² − dz²',
    history: {
      zh: '赫尔曼·闵可夫斯基于 1908 年在科隆学术会议上提出时空几何框架，开场白是："从今往后，孤立的空间和孤立的时间都将消退为阴影，只有两者的结合才能保持独立的现实。"爱因斯坦最初认为这不过是数学游戏，后来将其作为广义相对论的几何基础。',
      en: 'Hermann Minkowski presented the spacetime framework at the 1908 Cologne meeting, opening with: "Henceforth space by itself, and time by itself, are doomed to fade away into mere shadows, and only a kind of union of the two will preserve an independent reality." Einstein initially dismissed it as superfluous; he later adopted it as the foundation of general relativity.',
    },
  },

  'gravitational-lensing': {
    whatYouSee: {
      zh: '背景星系或点光源的光线经过前景大质量天体时发生弯曲，形成弧形像、多重像或完美的[爱因斯坦环|einstein-ring]。可调整透镜质量和源位置，观察弱引力透镜（轻微变形）与强引力透镜（弧和环）的过渡。',
      en: 'Light from background galaxies bends around a foreground mass, creating arcs, multiple images, or a perfect [Einstein ring|einstein-ring] when aligned. Adjust the lens mass and source position to explore the transition from weak lensing (mild distortion) to strong lensing (arcs and rings).',
    },
    physics: {
      zh: '[引力透镜|grav-lensing]是光沿弯曲时空中的[测地线|geodesic]传播的直接结果，经过质量 M 时偏折角 α = 4GM/c²b（牛顿值的两倍）。[爱因斯坦环|einstein-ring]半径 θ_E 可用于测量透镜天体（包括[暗物质|dark-matter]晕）的质量。引力[红移|redshift]——光子爬出引力井时损失能量——也在同一框架内统一。',
      en: '[Gravitational lensing|grav-lensing] is the direct consequence of light following [geodesics|geodesic] in curved spacetime; passing mass M it deflects by α = 4GM/c²b — twice the Newtonian value. The [Einstein ring|einstein-ring] radius θ_E weighs galaxy clusters and [dark matter|dark-matter] halos. Gravitational [redshift|redshift] — photons losing energy escaping a gravity well — is unified in the same GR framework.',
    },
    equation: 'α = 4GM/c²b  (GR),  α = 2GM/c²b  (Newtonian)',
    history: {
      zh: '爱因斯坦 1915 年计算出光在太阳附近偏折 1.75 角秒（是牛顿值的两倍）。英国天文学家亚瑟·爱丁顿率领的 1919 年日食远征队测量了这一偏折，确认了广义相对论。引力透镜于 1979 年首次被观测到（双类星体 Q0957+561），此后发展成强大的宇宙学工具，用于绘制暗物质分布图。',
      en: 'Einstein calculated 1.75 arcseconds deflection at the Sun\'s limb in 1915 — twice the Newtonian value. Arthur Eddington\'s 1919 eclipse expedition confirmed the GR prediction, making Einstein world-famous. Gravitational lensing was first observed in 1979 (twin quasar Q0957+561) and is now a primary tool for mapping dark matter.',
    },
  },

  'quantum-entanglement': {
    whatYouSee: {
      zh: '两个粒子的[量子纠缠|entanglement]态在不同测量基下的关联概率可视化。拨动测量角度可观察到[贝尔不等式|bell-inequality]的违反：量子关联超过任何经典局域理论所能产生的上限 2，达到量子极限 2√2（Tsirelson 界）。',
      en: 'Visualisation of measurement correlations for two [entangled|entanglement] particles in different measurement bases. Rotate the measurement angles to witness [Bell inequality|bell-inequality] violation: quantum correlations exceed the classical local-hidden-variable bound of 2, reaching the quantum Tsirelson bound 2√2.',
    },
    physics: {
      zh: '纠缠态（如[自旋|spin]贝尔态 |Φ⁺⟩ = (|↑↓⟩−|↓↑⟩)/√2）不可写成两粒子态的直积，是[叠加|superposition]的多体推广。对粒子 A 测量[自旋|spin]会瞬时影响粒子 B 的结果概率，无论距离多远，但不可用于超光速通信。CHSH 不等式 |⟨AB⟩−⟨AB′⟩+⟨A′B⟩+⟨A′B′⟩| ≤ 2（经典）vs. ≤ 2√2（量子）检验了局域实在论。',
      en: 'An [entangled|entanglement] [spin|spin] state like |Φ⁺⟩ = (|↑↓⟩−|↓↑⟩)/√2 cannot be written as a product of individual states — it is [superposition|superposition] extended to multiple particles. Measuring A\'s [spin|spin] instantly constrains B\'s outcome probabilities at any distance, yet no superluminal signalling is possible. The CHSH form of [Bell\'s inequality|bell-inequality] distinguishes quantum (≤ 2√2) from classical local (≤ 2) correlations.',
    },
    equation: '|⟨AB⟩ − ⟨AB′⟩ + ⟨A′B⟩ + ⟨A′B′⟩| ≤ 2√2  (quantum)',
    history: {
      zh: '爱因斯坦、波多尔斯基和罗森于 1935 年发表 EPR 论文，以纠缠为由质疑量子力学的完备性。约翰·贝尔于 1964 年推导出可实验检验的不等式。阿兰·阿斯佩克特等人 1982 年的实验首次清晰违反贝尔不等式。阿兰·阿斯佩克特、约翰·克劳泽和安东·蔡林格因此共获 2022 年诺贝尔物理学奖。',
      en: 'Einstein, Podolsky, and Rosen published the EPR paradox in 1935, questioning quantum completeness via entanglement. John Bell derived his testable inequality in 1964. Alain Aspect\'s 1982 experiments clearly violated it. Aspect, Clauser, and Zeilinger shared the 2022 Nobel Prize in Physics for their foundational experiments.',
    },
  },


  // ── Batch 7 (final) ───────────────────────────────────────────────────────

  'brownian-motion': {
    whatYouSee: {
      zh: '数百个气体分子（按速度从蓝到红着色）与一个大质量花粉颗粒（铜色球）发生弹性碰撞。花粉颗粒留下不规则的随机游走轨迹。升高温度，分子运动加剧，轨迹更混乱；隐藏气体分子，可见"无形之手"驱动花粉颗粒运动。',
      en: 'Hundreds of gas molecules (colour-coded blue→red by speed) elastically collide with a heavy pollen grain (copper sphere). The grain traces an erratic random walk. Raise temperature to intensify molecular motion; hide gas molecules to see the "invisible" forces driving the grain.',
    },
    physics: {
      zh: '花粉颗粒受到周围气体分子的随机弹性碰撞。分子[平均自由程|mean-free-path]远小于颗粒尺寸，使碰撞呈现连续随机激励的特征。速率分布由麦克斯韦–[玻尔兹曼因子|boltzmann-factor]统计描述，均方根速率 v_rms = √(2kT/m)。布朗运动是[扩散|diffusion]的微观起源，均方位移 ⟨r²⟩ = 4Dt 随时间线性增长，[扩散|diffusion]系数 D = kT/(6πηr)（斯托克斯–爱因斯坦关系）。',
      en: 'The pollen grain is buffeted by random elastic collisions with gas molecules whose [mean free path|mean-free-path] ≪ grain size, making the kicks appear as a continuous random force. Molecular speeds follow the Maxwell–[Boltzmann factor|boltzmann-factor] distribution with v_rms = √(2kT/m). Brownian motion is the microscopic origin of [diffusion|diffusion]: ⟨r²⟩ = 4Dt grows linearly, with [diffusion|diffusion] coefficient D = kT/(6πηr) (Stokes–Einstein relation).',
    },
    equation: '⟨r²⟩ = 4Dt,  D = kT / (6πηr)',
    history: {
      zh: '罗伯特·布朗于 1827 年在显微镜下观察到花粉颗粒在水中的随机运动，无法解释其来源。阿尔伯特·爱因斯坦于 1905 年（"奇迹年"）发表理论分析，将布朗运动与分子热运动联系起来，给出扩散系数公式。让·佩兰于 1908–1909 年通过精密实验验证了爱因斯坦的预言，从而确认了原子的真实存在，获 1926 年诺贝尔物理学奖。',
      en: 'Robert Brown observed pollen grains jiggling in water under a microscope in 1827 but could not explain the cause. Albert Einstein\'s 1905 paper (one of his "Annus Mirabilis" papers) provided the theoretical analysis, linking Brownian motion to molecular thermal motion and deriving the diffusion coefficient. Jean Perrin\'s 1908–09 experiments confirmed Einstein\'s predictions, providing decisive evidence for the reality of atoms (Nobel 1926).',
    },
  },

  'wavefunction-evolution': {
    whatYouSee: {
      zh: '一维[波函数|wavefunction] |ψ|²（琥珀填充区）、Re(ψ)（蓝色线）和 Im(ψ)（青色线）的实时演化。高斯波包从左侧出发，向右传播，撞击势垒后分为透射波和反射波。可切换势场类型（势垒/势阱/双势垒/自由），观察[量子隧穿|tunneling]和干涉现象。',
      en: 'Real-time evolution of a 1D [wavefunction|wavefunction]: |ψ|² (amber fill), Re(ψ) (blue), Im(ψ) (teal). A Gaussian wave packet propagates rightward, splitting into transmitted and reflected waves at the barrier. Switch potential types (barrier/well/double/free) to observe [quantum tunneling|tunneling] and interference.',
    },
    physics: {
      zh: '一维含时薛定谔方程 iħ ∂ψ/∂t = [Ĥ|hamiltonian]ψ = (−ħ²/2m ∂²/∂x² + V(x))ψ 用 Askar–Cakmak 蛙跳格式数值求解（原子单位，N=512 格点）。初始高斯波包是动量本征态的[傅里叶叠加|fourier-transform]，构成[叠加态|superposition]。透射率 T 随势垒高度 V₀ 与粒子动能 E=k₀²/2 的比值指数变化——V₀ > E 时[量子隧穿|tunneling]主导。',
      en: 'The 1D TDSE iħ ∂ψ/∂t = [Ĥ|hamiltonian]ψ = (−ħ²/2m ∂²/∂x² + V)ψ is solved numerically (Askar–Cakmak leapfrog, atomic units, N=512). The initial Gaussian is a [Fourier superposition|fourier-transform] of momentum eigenstates — a [superposition|superposition] state. Transmission T varies exponentially with V₀/E; below-barrier [tunneling|tunneling] dominates when V₀ > E.',
    },
    equation: 'iħ ∂ψ/∂t = −(ħ²/2m) ∂²ψ/∂x² + V(x)ψ',
    history: {
      zh: '埃尔温·薛定谔于 1926 年建立波动力学，给出以他命名的方程。含时方程描述量子态随时间的演化，含薛定谔方程的精确数值解法直到计算机时代才得到广泛应用。量子力学在原子物理、化学、固态物理等领域的成功使其成为现代科学的基石。',
      en: 'Erwin Schrödinger established wave mechanics and his equation in 1926. Accurate numerical solutions of the time-dependent Schrödinger equation became practical only with computers, enabling the simulation shown here. Quantum mechanics underpins atomic physics, chemistry, solid-state physics, and the semiconductor technology of modern electronics.',
    },
  },

  'lagrange-points': {
    whatYouSee: {
      zh: '圆形限制性三体问题的共旋转参考系：有效势场以颜色热图呈现（深蓝→铜色对应低势→高势），五个平衡点（L1–L5）以红色（不稳定）或绿色（稳定）标记。测试粒子从各 L 点附近出发，L1–L3 粒子很快逃离，而 L4/L5 附近的粒子（质量比 μ < 0.0385 时）在稳定的蝌蚪轨道上长期振荡。',
      en: 'The co-rotating frame of the Circular Restricted Three-Body Problem: the effective potential is shown as a heatmap (deep blue→copper = low→high), with L1–L5 marked red (unstable) or green (stable). Test particles near L1–L3 escape quickly; particles near L4/L5 (when μ < 0.0385) execute stable tadpole orbits indefinitely.',
    },
    physics: {
      zh: '[有效势|effective-potential] Φ_eff = −m₁/r₁ − m₂/r₂ − (x²+y²)/2 结合了引力势和离心势。L1、L2、L3 是 x 轴上的鞍点，总是不稳定。L4/L5 是精确等边三角形顶点，对质量比 μ < 0.0385 时为势能局域极大值，[科里奥利力|coriolis]使轨道稳定，特洛伊小行星群（木星 L4/L5）正是其实例。',
      en: 'The [effective potential|effective-potential] Φ_eff = −m₁/r₁ − m₂/r₂ − (x²+y²)/2 combines gravity and centrifugal terms. L1/L2/L3 are saddle points on the x-axis (always unstable). L4/L5 are at exact equilateral triangle vertices; for μ < 0.0385 they are local potential maxima, stabilised by [Coriolis forces|coriolis]. Jupiter\'s Trojan asteroids inhabit these points.',
    },
    equation: 'μ_crit = (1 − √(23/27))/2 ≈ 0.03852',
    history: {
      zh: '约瑟夫–路易斯·拉格朗日于 1772 年发现了三体问题的五个平衡点。1906 年，天文学家马克斯·沃尔夫在木星 L4 附近发现了第一颗特洛伊小行星赫克托耳（588 Achilles），此后木星特洛伊族已有超过 10,000 个成员。2021 年，NASA"露西"（Lucy）探测器出发前往考察特洛伊小行星族。',
      en: 'Joseph-Louis Lagrange discovered the five equilibrium points of the three-body problem in 1772. In 1906, Max Wolf discovered the first Jupiter Trojan asteroid (588 Achilles) near L4; the Jupiter Trojan population now exceeds 10,000 known members. NASA\'s Lucy mission, launched in 2021, is the first spacecraft to visit the Trojan asteroids.',
    },
  },

} // end of MODULE_DESCRIPTIONS

export default MODULE_DESCRIPTIONS
