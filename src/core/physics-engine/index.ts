// ─────────────────────────────────────────────
//  Shared physics utilities
//  All modules can import from here.
// ─────────────────────────────────────────────

/** Runge-Kutta 4th order integrator.
 *  state: current state vector
 *  deriv: function(state) → derivatives
 *  dt:    timestep in seconds
 */
export function rk4(
  state: number[],
  deriv: (s: number[]) => number[],
  dt: number
): number[] {
  const k1 = deriv(state)
  const k2 = deriv(state.map((s, i) => s + (dt / 2) * k1[i]))
  const k3 = deriv(state.map((s, i) => s + (dt / 2) * k2[i]))
  const k4 = deriv(state.map((s, i) => s + dt * k3[i]))
  return state.map((s, i) => s + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
}

/** Clamp a value between min and max */
export const clamp = (val: number, min: number, max: number) =>
  Math.max(min, Math.min(max, val))

/** Linear interpolation */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Convert degrees to radians */
export const toRad = (deg: number) => (deg * Math.PI) / 180

/** Convert radians to degrees */
export const toDeg = (rad: number) => (rad * 180) / Math.PI

/** Map a value from one range to another */
export const mapRange = (
  val: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
) => outMin + ((val - inMin) / (inMax - inMin)) * (outMax - outMin)

/** 2D vector type */
export type Vec2 = { x: number; y: number }

/** 3D vector type */
export type Vec3 = { x: number; y: number; z: number }

export const vec2 = (x: number, y: number): Vec2 => ({ x, y })
export const vec3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z })

/** Physical constants (SI units) */
export const PHYSICS = {
  G:  6.674e-11,   // gravitational constant
  c:  2.998e8,     // speed of light (m/s)
  h:  6.626e-34,   // Planck constant
  hbar: 1.055e-34, // reduced Planck constant
  e:  1.602e-19,   // elementary charge
  me: 9.109e-31,   // electron mass
  mp: 1.673e-27,   // proton mass
  k:  1.381e-23,   // Boltzmann constant
  NA: 6.022e23,    // Avogadro's number
  a0: 5.292e-11,   // Bohr radius
} as const
