// TODO: Space scale module (coming soon)
// Will visualize celestial body comparisons and solar system orbits using Three.js

import type { PhysicsModule } from '@/types/physics'

const SpaceScaleModule: PhysicsModule = {
  id: 'space-scale',
  metadata: {
    title: '宇宙尺度',
    titleEn: 'Scale of the Universe',
    description: '从夸克到可观测宇宙——天体大小实时对比',
    theory: ['astrophysics', 'general-relativity'],
    mathLevel: 1,
    renderer: 'threejs',
    linkedModules: ['schwarzschild', 'gravitational-lensing'],
  },
  init: () => ({}),
  tick: (s) => s,
  render: () => {},
  getControls: () => [],
  destroy: () => {},
}

export default SpaceScaleModule
