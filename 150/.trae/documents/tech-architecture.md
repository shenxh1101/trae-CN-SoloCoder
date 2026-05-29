## 1. 架构设计

```mermaid
flowchart TD
    "前端展示层" --> "Three.js 3D引擎"
    "Three.js 3D引擎" --> "粒子系统模块"
    "Three.js 3D引擎" --> "后处理模块"
    "Three.js 3D引擎" --> "交互控制模块"
    "粒子系统模块" --> "粒子几何体"
    "粒子系统模块" --> "连线几何体"
    "粒子系统模块" --> "中心光球"
    "后处理模块" --> "Bloom发光"
    "后处理模块" --> "拖尾效果"
    "交互控制模块" --> "OrbitControls"
    "交互控制模块" --> "参数面板"
    "前端展示层" --> "UI控制面板"
    "UI控制面板" --> "滑块控件"
    "UI控制面板" --> "开关控件"
    "UI控制面板" --> "按钮控件"
    "前端展示层" --> "工具模块"
    "工具模块" --> "截图功能"
    "工具模块" --> "配置导入导出"
```

## 2. 技术说明
- 前端：React@18 + Tailwind CSS@3 + Vite
- 3D引擎：Three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing
- 初始化工具：Vite
- 后端：无
- 数据库：无（纯前端，配置通过JSON文件导入导出）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 主页面，3D粒子环场景及控制面板 |

## 4. 核心数据结构

### 4.1 环配置数据模型
```typescript
interface RingConfig {
  radius: number;           // 环半径 (1-10)
  particleCount: number;    // 粒子数量 (500-5000)
  rotationSpeed: number;    // 旋转速度 (0-5)
  particleSize: number;     // 粒子大小 (0.01-0.3)
  thickness: number;        // 环厚度 (0-3)
  colorMode: 'rainbow' | 'redOrange' | 'blueGreen';  // 颜色模式
  background: 'black' | 'darkBlue' | 'starfield';     // 背景
  trailEnabled: boolean;    // 拖尾效果
  linesEnabled: boolean;    // 连线效果
  centerGlowEnabled: boolean; // 中心光球
  autoRotate: boolean;      // 相机自动旋转
}
```

### 4.2 默认配置
```json
{
  "radius": 5,
  "particleCount": 2000,
  "rotationSpeed": 1,
  "particleSize": 0.08,
  "thickness": 0.5,
  "colorMode": "rainbow",
  "background": "black",
  "trailEnabled": false,
  "linesEnabled": false,
  "centerGlowEnabled": false,
  "autoRotate": false
}
```

## 5. 性能优化策略
- 粒子使用 BufferGeometry + Points 渲染，避免逐粒子创建Mesh
- 连线使用 LineSegments + BufferGeometry，动态更新
- 拖尾效果使用 AfterImage 后处理 pass
- 参数变更时使用 useMemo 减少不必要的重建
- 连线效果在粒子数量>3000时自动跳过部分粒子连接
