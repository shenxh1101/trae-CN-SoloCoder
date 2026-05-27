## 1. 架构设计

```mermaid
flowchart TD
    "React前端" --> "Three.js 3D引擎"
    "Three.js 3D引擎" --> "@react-three/fiber React绑定"
    "@react-three/fiber React绑定" --> "@react-three/drei 辅助工具"
    "@react-three/drei 辅助工具" --> "粒子球体场景"
    "@react-three/drei 辅助工具" --> "OrbitControls"
    "@react-three/postprocessing" --> "拖尾后处理效果"
    "Zustand状态管理" --> "控制参数"
    "控制参数" --> "粒子数量/大小/半径"
    "控制参数" --> "运动方式/形状/背景"
    "控制参数" --> "线条连接/拖尾/自动旋转"
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + Tailwind CSS + Vite
- **3D引擎**：Three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- **状态管理**：Zustand
- **初始化工具**：vite-init (react-ts 模板)
- **后端**：无（纯前端应用）
- **数据库**：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，包含3D粒子球体场景和控制面板 |

## 4. 组件架构

| 组件 | 职责 |
|------|------|
| App | 根组件，布局3D场景和控制面板 |
| ParticleSphere | 粒子球体3D场景核心组件 |
| ControlPanel | 右侧悬浮控制面板 |
| InfoOverlay | 左上角FPS和粒子数量信息 |
| ParticleShape | 自定义粒子形状纹理生成 |

## 5. 状态管理（Zustand Store）

```typescript
interface ParticleStore {
  particleCount: number;       // 1000-10000
  particleSize: number;        // 粒子大小
  sphereRadius: number;        // 球体半径
  motionMode: 'static' | 'rotateY' | 'rotateXY'; // 运动方式
  particleShape: 'sphere' | 'cube' | 'star';     // 粒子形状
  background: 'black' | 'white' | 'starfield';   // 背景
  showLines: boolean;          // 线条连接效果
  autoRotate: boolean;         // 自动旋转相机
  trailEffect: boolean;        // 拖尾效果
}
```

## 6. 性能优化策略

- 使用 BufferGeometry 存储粒子位置和颜色
- 参数变化时使用 ref 直接操作几何体，避免React重渲染
- 线条连接使用空间分区减少计算量
- 拖尾效果使用 AfterImage 后处理Pass
- 截图功能使用 renderer.domElement.toDataURL()
