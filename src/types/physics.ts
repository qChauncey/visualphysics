// ─────────────────────────────────────────────
//  Core types — define once, never change the shape
// ─────────────────────────────────────────────

export type TheoryTag =
  | 'classical-mechanics'
  | 'thermodynamics'
  | 'quantum-mechanics'
  | 'quantum-field-theory'
  | 'special-relativity'
  | 'general-relativity'
  | 'string-theory'
  | 'loop-quantum-gravity'
  | 'quantum-gravity'
  | 'holography'
  | 'astrophysics'
  | 'particle-physics'
  | 'beyond-standard-model'

export type RendererType = 'canvas2d' | 'threejs' | 'webgl' | 'webgpu' | 'wasm'
export type MathLevel = 1 | 2 | 3  // 1=科普 2=本科 3=研究生

// ─── Control definitions (auto-generates the parameter panel UI) ───

export type ControlDefinition =
  | { type: 'slider';   id: string; label: string; min: number; max: number; step: number; default: number }
  | { type: 'toggle';   id: string; label: string; default: boolean }
  | { type: 'select';   id: string; label: string; options: { value: string; label: string }[]; default: string }
  | { type: 'button';   id: string; label: string }
  | { type: 'body-selector'; id: string; label: string }  // for space module

export type Params = Record<string, number | boolean | string>

// ─── The unified module interface ───────────────────────────────────
//
//  Every physics experiment/theory is a plugin that implements this.
//  Adding a new module = new folder + this interface. Zero changes elsewhere.

export interface PhysicsModule<S = unknown> {
  id: string
  metadata: {
    title: string
    titleEn: string
    description: string
    theory: TheoryTag[]
    mathLevel: MathLevel
    renderer: RendererType
    /** modules this one can link/jump to */
    linkedModules?: string[]
  }

  /** Called once when module mounts. Returns initial simulation state. */
  init(canvas: HTMLElement, params: Params): S

  /** Called every animation frame. Returns next simulation state. */
  tick(state: S, dt: number, params: Params): S

  /** Draws current state onto the canvas/renderer. */
  render(state: S, canvas: HTMLElement, params: Params): void

  /** Defines what controls appear in the parameter panel. */
  getControls(): ControlDefinition[]

  /** Called when module unmounts — clean up WebGL contexts, listeners, etc. */
  destroy(canvas: HTMLElement): void
}
