import type { PhysicsModule } from '@/types/physics'

// ─────────────────────────────────────────────
//  Module Registry
//  Modules register themselves here.
//  The rest of the app only talks to this registry.
// ─────────────────────────────────────────────

const registry = new Map<string, () => Promise<{ default: PhysicsModule }>>()

/** Register a module with a lazy import factory */
export function registerModule(
  id: string,
  factory: () => Promise<{ default: PhysicsModule }>
) {
  registry.set(id, factory)
}

/** Load a module by id (dynamic import — only loads when needed) */
export async function loadModule(id: string): Promise<PhysicsModule | null> {
  const factory = registry.get(id)
  if (!factory) {
    console.warn(`[Registry] Module not found: ${id}`)
    return null
  }
  const mod = await factory()
  return mod.default
}

/** List all registered module ids */
export function listModules(): string[] {
  return Array.from(registry.keys())
}

// ─────────────────────────────────────────────
//  Register all modules here.
//  To add a new module: one line below + create the folder.
// ─────────────────────────────────────────────

registerModule('double-pendulum',      () => import('@/modules/double-pendulum'))
registerModule('hydrogen-orbital',     () => import('@/modules/hydrogen-orbital'))
registerModule('space-scale',          () => import('@/modules/space-scale'))
registerModule('double-slit',          () => import('@/modules/double-slit'))
registerModule('spacetime-curvature',  () => import('@/modules/spacetime-curvature'))
registerModule('calabi-yau',           () => import('@/modules/calabi-yau'))
registerModule('gravitational-waves',  () => import('@/modules/gravitational-waves'))
registerModule('three-body',           () => import('@/modules/three-body'))
registerModule('ising-model',          () => import('@/modules/ising-model'))
registerModule('schwarzschild',        () => import('@/modules/schwarzschild'))
registerModule('higgs-field',          () => import('@/modules/higgs-field'))
registerModule('feynman-diagrams',     () => import('@/modules/feynman-diagrams'))
registerModule('quantum-tunneling',   () => import('@/modules/quantum-tunneling'))
registerModule('string-worldsheet',   () => import('@/modules/string-worldsheet'))
registerModule('blackbody-radiation', () => import('@/modules/blackbody-radiation'))
registerModule('minkowski-diagram',   () => import('@/modules/minkowski-diagram'))
registerModule('gravitational-lensing', () => import('@/modules/gravitational-lensing'))
registerModule('quantum-entanglement',  () => import('@/modules/quantum-entanglement'))
