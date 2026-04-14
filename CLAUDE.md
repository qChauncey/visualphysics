# CLAUDE.md — Developer Memory

This file is for Claude to maintain development context across sessions. Update after each significant change.

---

## Project Overview

**visualphysics** — Interactive physics experiments, browser-native computation.
- Stack: Next.js 15 (App Router) + TypeScript + Tailwind CSS + Three.js + Canvas 2D
- Deployed on Vercel. Branch: `claude/add-physics-module-KQ5EQ`
- Repo: `qChauncey/visualphysics`

---

## Architecture

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

### i18n
- Context: `src/core/i18n/index.tsx` — `LangProvider`, `useLang()`, `UI` string object
- Auto-detects `navigator.language` on first load; persists to `localStorage`
- Toggle button in Sidebar footer (shows "EN" / "中")
- Module metadata: `title` (zh) + `titleEn` (en) + optional `descriptionEn` in `PhysicsModule`
- Control labels: `label` (zh) + optional `labelEn` (en) in `ControlDefinition` — `ModuleViewer` picks the right one
- Select options also support `labelEn`

### Layout
- `AppLayout` (`src/ui/components/AppLayout.tsx`) — shared shell with sidebar drawer
  - Desktop: sidebar always visible (`md:relative`)
  - Mobile: sidebar hidden by default, slides in via hamburger button (fixed, z-50)
  - Overlay backdrop closes drawer on tap
- `Sidebar` accepts `onClose?: () => void` prop; calls it on link click to close drawer

### Theory Tree
- Data: `src/core/theory-tree/data.ts` — `TheoryNode[]` + `CAT_CONFIG` + `NODE_MAP`
- Component: `src/ui/components/TheoryTree.tsx` — SVG canvas, pan+zoom, node click panel
- Page: `src/app/theory/page.tsx` — wrapped in `AppLayout`
- 20 historical nodes across 6 category lanes, edges show influence arrows
- Nodes with linked modules show dashed outer ring; detail panel has "Open module" button

---

## Modules

| ID | Num | Title (zh) | Title (en) | Status |
|----|-----|-----------|------------|--------|
| `double-pendulum` | 01 | 双摆混沌 | Double Pendulum | ✅ ready |
| `hydrogen-orbital` | 02 | 氢原子轨道 | Hydrogen Orbitals | ✅ ready |
| `space-scale` | 03 | 宇宙尺度 | Cosmic Scale | ✅ ready |
| `double-slit` | 04 | 双缝实验 | Double Slit | ✅ ready |
| `spacetime-curvature` | 05 | 时空曲率 | Spacetime Curvature | ✅ ready |
| `calabi-yau` | 06 | Calabi-Yau 流形 | Calabi-Yau Manifold | ✅ ready |

### double-pendulum
Canvas 2D. RK4 integration. Two pendulums diverge from slight angle offset. Controls: angles, masses, lengths, reset. All labels bilingual.

### hydrogen-orbital
Canvas 2D. Pre-computed probability density grid (offscreen canvas cache). 1s/2s/2p/3s/3p/3d. Pan + zoom + hover probe (r in a₀, θ°, |ψ|²). Controls bilingual.

### space-scale
Three.js. Solar system size comparison + orbital mode. Controls bilingual.

### double-slit
Canvas 2D. `I(θ) = sinc²(πa sinθ/λ) · cos²(πd sinθ/λ)`. Inverse-CDF sampling. Observed mode = Gaussian peaks. Heatmap on detector. Controls bilingual.

### spacetime-curvature
Three.js. PlaneGeometry 72×72 segments warped downward by Newtonian potential sum. Three draggable mass spheres. Mouse raycasting against horizontal plane to drag. Controls: gravity strength, mass value, camera rotate. Vertex colours blend flat-blue → copper with depth. Wireframe overlay.

### calabi-yau
Three.js. Parametric Calabi-Yau surface: z1^n + z2^n = 1 in C². For each (k1,k2) patch: z1 = e^(2πi k1/n)·cos(α)^(2/n), z2 = e^(2πi k2/n)·sin(α)^(2/n); project Re(z1),Re(z2),Im(z1) → 3D. n=2..5 patches. Vertex colours by patch hue. Controls: n order, rotation speed, wireframe toggle.

---

## Key Files

```
src/
  app/
    layout.tsx                      — Root layout, wraps with LangProvider
    page.tsx                        — Homepage: particle sphere + hero text
    module/[id]/page.tsx            — Module detail page
    theory/page.tsx                 — Theory Tree page
  core/
    i18n/index.tsx                  — LangContext, useLang, UI strings
    registry/index.ts               — Module registry (lazy imports)
    renderer/useModuleRunner.ts     — Animation loop, merges viewRef each frame
    theory-tree/data.ts             — TheoryNode data + CAT_CONFIG + NODE_MAP
  modules/
    double-pendulum/index.ts
    hydrogen-orbital/index.ts
    space-scale/index.ts
    double-slit/index.ts
    spacetime-curvature/index.ts
    calabi-yau/index.ts
  types/physics.ts                  — PhysicsModule interface, ControlDefinition (with labelEn), Params
  ui/
    components/
      AppLayout.tsx                 — Sidebar shell + mobile drawer
      Sidebar.tsx                   — Navigation sidebar with lang toggle + theory link
      ParticleSphere.tsx            — Three.js particle sphere (homepage)
      ModuleViewer.tsx              — Canvas + controls, mouse+touch pan/zoom
      TheoryTree.tsx                — SVG theory timeline with pan/zoom/click
```

---

## Patterns & Gotchas

- **`'use client'` required** on any file using `next/dynamic` with `ssr: false`
- **`useModuleRunner` stale closure**: use `runningRef` (synced via `setRunning` wrapper) rather than reading `running` state directly in the loop
- **Particle sphere object space**: mouse ray must be transformed via `invMat.copy(pts.matrixWorld).invert()` + `transformDirection` to correctly handle sphere rotation
- **Zoom centred on cursor**: use `fracX = (mx - oldOx) / oldSz` math, not simple delta
- **LangProvider needs `'use client'`** — it uses `useEffect` for localStorage + navigator.language
- **Next.js 15.5.15** (npm `backport` tag) — the version that clears the CVE-2025-66478 Vercel block
- **`.npmrc`**: `legacy-peer-deps=true` for React 19 / Three.js peer dep conflict
- **`vercel.json`**: only `{ "framework": "nextjs" }` — adding `outputDirectory` or `buildCommand` breaks it
- **Spacetime curvature drag**: `params._mouseX/_mouseY/_dragging` are injected by ModuleViewer via viewRef; the module reads them in `tick()` to project onto the drag plane
- **Calabi-Yau cpow()**: use `Math.max(r, 1e-12)` to avoid NaN at origin when computing complex power

---

## Pending / Planned

- [ ] All modules implemented (01-06) ✅
- [ ] Theory Tree ✅
- [ ] Touch events for canvas pan/zoom ✅
- [ ] Control labels i18n ✅
- [ ] Spacetime curvature: could add particle orbit traces (geodesics) in a future pass
- [ ] Theory Tree: could add zoom-to-fit button, mini-map, search

---

## Git Workflow

- Feature branch: `claude/add-physics-module-KQ5EQ`
- Push: `git push -u origin claude/add-physics-module-KQ5EQ`
- PRs go from this branch → `main` (user merges)
- Create a PR after each logical batch of changes

---

*Last updated: 2026-04-14*
