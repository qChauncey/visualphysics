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
`ModuleViewer.tsx` manages a `viewRef: MutableRefObject<Params>` for pan/zoom/hover state. Updated on every mouse event **without** React re-renders. Merged into `allParams` inside the animation loop in `useModuleRunner.ts`.

### i18n
- Context: `src/core/i18n/index.tsx` — `LangProvider`, `useLang()`, `UI` string object
- Auto-detects `navigator.language` on first load; persists to `localStorage`
- Toggle button in Sidebar footer (shows "EN" / "中")
- Module metadata: `title` (zh) + `titleEn` (en) + optional `descriptionEn` in `PhysicsModule`

### Layout
- `AppLayout` (`src/ui/components/AppLayout.tsx`) — shared shell with sidebar drawer
  - Desktop: sidebar always visible (`md:relative`)
  - Mobile: sidebar hidden by default, slides in via hamburger button (fixed, z-50)
  - Overlay backdrop closes drawer on tap
- `Sidebar` accepts `onClose?: () => void` prop; calls it on link click to close drawer

---

## Modules

| ID | Num | Title (zh) | Title (en) | Status |
|----|-----|-----------|------------|--------|
| `double-pendulum` | 01 | 双摆混沌 | Double Pendulum | ✅ ready |
| `hydrogen-orbital` | 02 | 氢原子轨道 | Hydrogen Orbitals | ✅ ready |
| `space-scale` | 03 | 宇宙尺度 | Cosmic Scale | ✅ ready |
| `double-slit` | 04 | 双缝实验 | Double Slit | ✅ ready |
| `spacetime-curvature` | 05 | 时空曲率 | Spacetime Curvature | 🚧 SOON |
| `calabi-yau` | 06 | Calabi-Yau 流形 | Calabi-Yau Manifold | 🚧 SOON |

### double-pendulum
Canvas 2D. RK4 integration. Shows two pendulums with slight angle offset diverging over time (chaos). Controls: initial angles, masses, rod lengths, reset.

### hydrogen-orbital
Canvas 2D. Pre-computed probability density grid (offscreen canvas cache). Supports 1s/2s/2p/3s/3p/3d orbitals. Pan + zoom + hover probe (shows r in a₀, θ°, |ψ|² at cursor). Control: orbital selector, field-of-view slider.

### space-scale
Three.js. Solar system bodies with relative size comparison. Orbit controls.

### double-slit
Canvas 2D. Quantum interference: `I(θ) = sinc²(πa sinθ/λ) · cos²(πd sinθ/λ)`. Particle sampling via inverse-CDF (600 bins). Observed mode switches to two Gaussian peaks (collapses interference). Heatmap accumulates on detector. Controls: observe toggle, λ, slit-d, slit-w, emission rate, reset.

---

## Key Files

```
src/
  app/
    layout.tsx                 — Root layout, wraps with LangProvider
    page.tsx                   — Homepage: particle sphere + hero text
    module/[id]/page.tsx       — Module detail page
  core/
    i18n/index.tsx             — LangContext, useLang, UI strings
    registry/index.ts          — Module registry (lazy imports)
    renderer/useModuleRunner.ts — Animation loop, merges viewRef each frame
  modules/
    double-pendulum/index.ts
    hydrogen-orbital/index.ts
    space-scale/index.ts
    double-slit/index.ts
  types/physics.ts             — PhysicsModule interface, ControlDefinition, Params
  ui/
    components/
      AppLayout.tsx            — Sidebar shell + mobile drawer
      Sidebar.tsx              — Navigation sidebar with lang toggle
      ParticleSphere.tsx       — Three.js particle sphere (homepage)
      ModuleViewer.tsx         — Canvas + auto-generated controls panel
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

---

## Pending / Planned

- [ ] Module 05: Spacetime Curvature — Three.js mesh warping, drag a mass to warp the grid
- [ ] Module 06: Calabi-Yau Manifold — parametric surface rendering
- [ ] Theory Tree (`/theory`) — interactive physics timeline SVG, categorized branches, links to modules
- [ ] Control labels i18n (currently Chinese only in modules)
- [ ] Touch events for pan/zoom on mobile canvas (currently mouse-only)

---

## Git Workflow

- Feature branch: `claude/add-physics-module-KQ5EQ`
- Push: `git push -u origin claude/add-physics-module-KQ5EQ`
- PRs go from this branch → `main` (user merges)
- Create a PR after each logical batch of changes

---

*Last updated: 2026-04-14*
