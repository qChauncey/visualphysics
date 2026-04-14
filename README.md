# 物理可视化 / Physics Visualization

交互式物理实验与理论可视化网站。

## 快速开始

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 项目结构

```
src/
  types/physics.ts          # PhysicsModule 统一接口
  core/
    registry/               # 模块注册系统
    renderer/               # useModuleRunner hook
    physics-engine/         # 共享数学工具（RK4 等）
  modules/
    double-pendulum/        # ✅ 双摆混沌（已完成）
    hydrogen-orbital/       # 🚧 氢原子轨道
    space-scale/            # 🚧 宇宙尺度
  ui/
    components/ModuleViewer # 通用模块渲染器 + 参数面板
  app/
    page.tsx                # 首页
    module/[id]/page.tsx    # 模块页
```

## 新增模块

1. 在 `src/modules/` 下新建文件夹
2. 实现 `PhysicsModule` 接口
3. 在 `src/core/registry/index.ts` 注册一行
4. 完成

## 部署

连接 GitHub → Vercel 自动部署。
每次 push 到 main 分支即触发部署。
