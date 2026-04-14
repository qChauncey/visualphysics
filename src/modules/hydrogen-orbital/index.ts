// TODO: Hydrogen orbital module (coming soon)
// Will visualize 1s, 2p, 3d probability density clouds using WebGL

import type { PhysicsModule } from '@/types/physics'

const HydrogenOrbitalModule: PhysicsModule = {
  id: 'hydrogen-orbital',
  metadata: {
    title: '氢原子轨道',
    titleEn: 'Hydrogen Orbitals',
    description: '量子力学概率云——1s / 2p / 3d 轨道三维可视化',
    theory: ['quantum-mechanics'],
    mathLevel: 2,
    renderer: 'webgl',
  },
  init: () => ({}),
  tick: (s) => s,
  render: () => {},
  getControls: () => [],
  destroy: () => {},
}

export default HydrogenOrbitalModule
