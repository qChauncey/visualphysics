# 物理可视化 / Physics Visualization

从经典混沌到量子引力——交互式物理实验与理论可视化。

## 模块状态

| # | 模块 | 英文名 | 领域 | 状态 |
|---|------|--------|------|------|
| 01 | 双摆混沌 | Double Pendulum | Classical Mechanics | ✅ 已上线 |
| 02 | 氢原子轨道 | Hydrogen Orbitals | Quantum Mechanics | ✅ 已上线 |
| 03 | 宇宙尺度 | Scale of the Universe | Astrophysics / GR | ✅ 已上线 |
| 04 | 双缝实验 | Double Slit | Quantum Mechanics | 🔜 即将上线 |
| 05 | 时空曲率 | Spacetime Curvature | General Relativity | 🔜 即将上线 |
| 06 | Calabi-Yau 流形 | Calabi-Yau Manifold | String Theory | 🔜 即将上线 |

## 视觉风格

- **背景**：`#080808` 深黑
- **正文**：`#f0ede8` 暖白
- **Accent**：`#c8955a` 铜金
- **字体**：Cormorant Garamond（标题）/ DM Sans（正文）/ JetBrains Mono（数据标注）
- **动效**：`fade-up` 错帧入场，1px 细线分隔，无圆角

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 技术栈

- **框架**：Next.js 15.5.15 (App Router)
- **渲染**：React 19
- **3D**：Three.js + @react-three/fiber + @react-three/drei
- **样式**：Tailwind CSS 3
- **语言**：TypeScript 5
- **部署**：Vercel

## 项目结构

```
src/
  types/physics.ts            # PhysicsModule 统一接口
  core/
    registry/                 # 模块动态加载注册
    renderer/useModuleRunner  # 动画帧循环 hook
    physics-engine/           # 共享数学工具（RK4 积分器等）
  modules/
    double-pendulum/          # ✅ Canvas 2D + RK4 积分
    hydrogen-orbital/         # ✅ Canvas 2D 像素渲染，|ψ|² 概率密度
    space-scale/              # ✅ Three.js WebGL，太阳系真实比例
  ui/
    components/ModuleViewer   # 通用模块渲染器 + 自动生成参数控件
  app/
    page.tsx                  # 首页（editorial 网格卡片）
    module/[id]/page.tsx      # 模块详情页
```

## PhysicsModule 接口

每个模块实现同一接口，与渲染器解耦：

```typescript
interface PhysicsModule {
  metadata: { title, titleEn, description, theory[] }
  init(canvas, params): State
  tick(state, dt, params): State   // 物理步进（不操作 DOM）
  render(state, canvas, params): void  // 渲染（可操作 canvas）
  getControls(): ControlDefinition[]   // 声明 UI 控件
  destroy(canvas): void
}
```

## 新增模块

1. 在 `src/modules/<id>/` 下新建 `index.ts`，实现 `PhysicsModule`
2. 在 `src/core/registry/index.ts` 注册一行动态 import
3. 在 `src/app/page.tsx` 的 `MODULES` 数组中添加卡片，`ready: true`
4. 完成

## 部署

连接 GitHub → Vercel 自动部署。每次 push 到 `main` 分支即触发生产部署，PR 分支自动生成预览链接。
