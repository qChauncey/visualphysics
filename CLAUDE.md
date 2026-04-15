# CLAUDE.md — Developer Memory

This file is for Claude to maintain development context across sessions. Update after each significant change.

---

## Project Overview

**visualphysics** — Interactive physics experiments, browser-native computation.
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Three.js + Canvas 2D
- Deployed on Vercel (push to main auto-deploys). Branch: `claude/add-physics-module-KQ5EQ`
- Repo: `qChauncey/visualphysics`

---

## Architecture

Three-layer separation, one-way dependency:

```
UI Layer      (React components · param panels · theory nav · module routing)
     ↓
Render Layer  (Canvas 2D · Three.js · WebGL Shader · WebGPU · WASM)
     ↓
Module Layer  (each experiment/theory is an independent plugin)
```

**Core principle:** every physics module implements the unified `PhysicsModule` interface.
Adding a new module = create `src/modules/xxx/` + one `registerModule` line in registry — no existing code changes.

### Module System
Every physics experiment is a `PhysicsModule` plugin (`src/types/physics.ts`):
- `init(canvas, params)` → state
- `tick(state, dt, params)` → state
- `render(state, canvas, params)` → void
- `getControls()` → `ControlDefinition[]`
- `destroy(canvas)` → void

Modules are registered in `src/core/registry/index.ts` via `registerModule(id, () => import(...))`.

### View State (pan/zoom/mouse)
`ModuleViewer.tsx` manages a `viewRef: MutableRefObject<Params>` for pan/zoom/hover state. Updated on every mouse/touch event **without** React re-renders. Merged into `allParams` inside the animation loop in `useModuleRunner.ts`.

Injected params: `_panX`, `_panY`, `_zoom`, `_mouseX`, `_mouseY`, `_dragging`

### i18n
- Context: `src/core/i18n/index.tsx` — `LangProvider`, `useLang()`, `UI` string object
- Auto-detects `navigator.language` on first load; persists to `localStorage`
- Toggle button in Sidebar footer (shows "EN" / "中")
- Module metadata: `title` (zh) + `titleEn` (en) + optional `descriptionEn`
- Control labels: `label` (zh) + optional `labelEn` (en) — `ModuleViewer` picks the right one
- Select options also support `labelEn`

### Layout
- `AppLayout` (`src/ui/components/AppLayout.tsx`) — full-screen shell; all pages fill the viewport
  - **Desktop sidebar**: fixed overlay (z-50), hidden by default. Invisible 16px left-edge strip triggers `showSidebar()` on hover. Mouse leave → 2 s auto-hide timer. Hamburger button toggles visibility.
  - **Mobile**: hamburger button opens fixed drawer overlay; backdrop tap closes it.
  - No in-flow sidebar — `<main>` always fills 100% of viewport width.
- `Sidebar` props: `onClose?: () => void` (mobile), `onCollapse?: () => void` (desktop ‹ button)

### Module Viewer
- `ModuleViewer.tsx` — canvas fills `absolute inset-0` of its parent.
- Controls: collapsible bottom panel (translucent backdrop), collapsed by default.
- Play/Pause: top-right corner overlay.
- No 16:9 constraint — every experiment is full-screen.

### Theory Tree
- Data: `src/core/theory-tree/data.ts` — `TheoryNode[]` + `CAT_CONFIG` + `NODE_MAP`
- Component: `src/ui/components/TheoryTree.tsx` — SVG canvas, pan+zoom, node click panel
- Page: `src/app/theory/page.tsx` — wrapped in `AppLayout`
- 20 historical nodes across 6 category lanes, edges show influence arrows
- Nodes with linked modules show dashed outer ring; detail panel has "Open module" button

---

## Modules — Completed

| ID | Num | Title (zh) | Title (en) | Renderer | Status |
|----|-----|-----------|------------|----------|--------|
| `double-pendulum`     | 01 | 双摆混沌        | Double Pendulum     | Canvas 2D  | ✅ |
| `hydrogen-orbital`    | 02 | 氢原子轨道      | Hydrogen Orbitals   | Canvas 2D  | ✅ |
| `space-scale`         | 03 | 宇宙尺度        | Cosmic Scale        | Three.js   | ✅ |
| `double-slit`         | 04 | 双缝实验        | Double Slit         | Canvas 2D  | ✅ |
| `spacetime-curvature` | 05 | 时空曲率        | Spacetime Curvature | Three.js   | ✅ |
| `calabi-yau`          | 06 | Calabi-Yau 流形 | Calabi-Yau Manifold | Three.js   | ✅ |

### Module Notes

**double-pendulum** — RK4 integration. Two pendulums diverge from slight angle offset. Trail fade. Controls: angles, masses, lengths, reset.

**hydrogen-orbital** — Pre-computed probability density grid (offscreen canvas cache). 1s/2s/2p/3s/3p/3d. Pan + zoom + hover probe (r in a₀, θ°, |ψ|²).

**space-scale** — Solar system size comparison + orbital mode. Log scale slider.

**double-slit** — `I(θ) = sinc²(πa sinθ/λ) · cos²(πd sinθ/λ)`. Inverse-CDF sampling. Observed mode = Gaussian peaks. Heatmap on detector.

**spacetime-curvature** — PlaneGeometry 72×72 warped by Newtonian potential sum. Three draggable mass spheres via `_dragging`/`_mouseX`/`_mouseY` + raycasting against horizontal plane. Vertex colours flat-blue→copper with depth. Wireframe overlay.

**calabi-yau** — Parametric surface z1^n + z2^n = 1 in ℂ². Projects Re(z1), Re(z2), Im(z1) → 3D. n=2..5 patches, vertex colours by patch hue.

---

## Modules — Planned

### Batch 1 (high visual impact, moderate difficulty)

| ID | Num | Title (zh) | Title (en) | Renderer | Tags |
|----|-----|-----------|------------|----------|------|
| `gravitational-waves` | 07 | 引力波 | Gravitational Waves | Three.js/WebGL | general-relativity |
| `feynman-diagrams`    | 08 | 费曼图 | Feynman Diagrams | Canvas 2D/SVG | particle-physics, qft |
| `higgs-field`         | 09 | 希格斯场 | Higgs Field | Three.js | particle-physics |
| `ising-model`         | 10 | 伊辛模型 | Ising Model | Canvas 2D/WebGPU | thermodynamics |
| `three-body`          | 11 | 三体问题 | Three-Body Problem | Canvas 2D | classical-mechanics |
| `schwarzschild`       | 12 | 史瓦西黑洞 | Schwarzschild Black Hole | WebGL shader | general-relativity |

### Batch 2 (advanced theory, high math level)

| ID | Title (en) | Renderer | mathLevel | Tags |
|----|-----------|----------|-----------|------|
| `island-formula` | Quantum Island / Page Curve | Canvas 2D + Three.js | 3 | quantum-gravity, holography |
| `ads-cft` | AdS/CFT Holography | Three.js | 3 | holography, quantum-gravity |
| `spin-network` | Loop Quantum Gravity | Three.js / D3 | 3 | loop-quantum-gravity |
| `string-worldsheet` | String Worldsheet | Three.js | 3 | string-theory |

### Also planned (lower priority)

`minkowski-diagram`, `time-dilation`, `quantum-tunneling`, `wavefunction-evolution`,
`uncertainty-principle`, `quantum-entanglement`, `stern-gerlach`, `delayed-choice`,
`photoelectric`, `standing-waves`, `blackbody-radiation`, `maxwell-distribution`,
`brownian-motion`, `gravitational-lensing`, `lagrange-points`, `poincare-section`

---

## Renderer Selection Guide

| Renderer | Best for |
|----------|----------|
| Canvas 2D | 2D trajectories, stat plots, simple animation (double pendulum, double slit, Brownian motion) |
| Three.js | 3D geometry, orbits, mesh deformation (space-scale, spacetime curvature, gravitational waves) |
| WebGL GLSL | Real-time shading, probability density, manifolds (hydrogen orbitals, Calabi-Yau, black hole) |
| WebGPU | Massive parallel compute (Ising model, N-body particle systems) |
| WASM | Heavy numerical integration (path integrals, QFT simulation) |

---

## TheoryTag Complete List

```
'classical-mechanics' | 'thermodynamics' | 'quantum-mechanics' |
'quantum-field-theory' | 'special-relativity' | 'general-relativity' |
'string-theory' | 'loop-quantum-gravity' | 'quantum-gravity' |
'holography' | 'astrophysics' | 'particle-physics' | 'beyond-standard-model'
```

---

## Key Files

```
src/
  app/
    layout.tsx                      — Root layout, wraps with LangProvider
    page.tsx                        — Homepage: particle sphere + hero text
    module/[id]/page.tsx            — Full-screen module page (title overlay + ModuleViewer)
    theory/page.tsx                 — Theory Tree page
  core/
    i18n/index.tsx                  — LangContext, useLang, UI strings
    registry/index.ts               — Module registry (lazy imports)
    renderer/useModuleRunner.ts     — rAF loop: tick + render, merges viewRef each frame
    theory-tree/data.ts             — TheoryNode data + CAT_CONFIG + NODE_MAP
  modules/
    double-pendulum/index.ts
    hydrogen-orbital/index.ts
    space-scale/index.ts
    double-slit/index.ts
    spacetime-curvature/index.ts
    calabi-yau/index.ts
  types/physics.ts                  — PhysicsModule interface, ControlDefinition (labelEn), Params
  ui/
    components/
      AppLayout.tsx                 — Hover sidebar + mobile drawer shell
      Sidebar.tsx                   — Navigation sidebar with lang toggle + theory link
      ParticleSphere.tsx            — Three.js particle sphere (homepage)
      ModuleViewer.tsx              — Full-screen canvas + floating controls panel
      TheoryTree.tsx                — SVG theory timeline with pan/zoom/click
```

---

## Patterns & Gotchas

- **`'use client'` required** on any file using `next/dynamic` with `ssr: false`
- **`useModuleRunner` stale closure**: use `runningRef` (synced via `setRunning` wrapper), not `running` state, in the rAF loop
- **Particle sphere object space**: mouse ray must use `invMat.copy(pts.matrixWorld).invert()` + `transformDirection`
- **Zoom centred on cursor**: `fracX = (mx - oldOx) / oldSz` math, not simple delta
- **LangProvider needs `'use client'`** — uses `useEffect` for localStorage + `navigator.language`
- **Next.js 15.5.15** (`backport` npm tag) — clears CVE-2025-66478 Vercel block
- **`.npmrc`**: `legacy-peer-deps=true` for React 19 / Three.js peer dep conflict
- **`vercel.json`**: only `{ "framework": "nextjs" }` — adding `outputDirectory` or `buildCommand` breaks builds
- **Spacetime curvature drag**: `params._mouseX/_mouseY/_dragging` are injected by ModuleViewer via viewRef; module reads them in `tick()` to raycast onto drag plane. `dragIdx` resets to -1 when `!_dragging`; picked up from `.hovered` flag on drag start.
- **Calabi-Yau cpow()**: `Math.max(r, 1e-12)` avoids NaN at origin during complex power computation
- **ModuleViewer absolute inset-0**: the canvas fills its `absolute inset-0` root div; module page wraps it in `<AppLayout mainClassName="flex-1 relative overflow-hidden">`
- **Sidebar hover timer**: `hideTimerRef` holds a `setTimeout` id; always clear before setting a new one to prevent double-firing

---

## Design Tokens

- Background: `#080810` / `#040404` (deep space black)
- Accent: `#c8955a` (copper/amber) — active states, values, highlights
- Text: `#f0ede8` at various opacities (full → /80 → /52 → /35 → /18)
- Quantum/classical: blue-400 `#60a5fa`
- Font: display (light weight headings) + mono (labels, numbers, hints)
- All modules: bilingual zh/en, pause/resume, reset

---

## Git Workflow

- Feature branch: `claude/add-physics-module-KQ5EQ`
- Push: `git push -u origin claude/add-physics-module-KQ5EQ`
- PRs go from this branch → `main` (user merges)
- Create a PR after each logical batch of changes

---

*Last updated: 2026-04-15*
