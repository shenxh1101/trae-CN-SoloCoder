## 1. 架构设计

```mermaid
flowchart TD
    "A[浏览器]" --> "B[HTML/CSS/JS]"
    "B" --> "C[Three.js r128+]"
    "C" --> "D[3D渲染引擎]"
    "B" --> "E[UI控制面板]"
    "E" --> "F[事件监听/状态管理]"
    "F" --> "C"
    "C" --> "G[Canvas 2D渲染]"
    "B" --> "H[导出模块]"
    "H" --> "I[PNG截图]"
    "H" --> "J[OBJ文件导出]"
```

## 2. 技术说明
- 前端：纯HTML/CSS/JavaScript + Three.js（通过CDN引入）
- 构建工具：无构建步骤，纯静态页面，直接浏览器运行
- 后端：无后端，纯前端应用
- 数据库：无数据库需求
- 样式：原生CSS3 + CSS变量 + Flexbox/Grid布局
- 图标：Unicode符号，无需图标库

## 3. 文件结构
| 文件路径 | 用途 |
|----------|------|
| /index.html | 主页面，包含Canvas容器和控制面板DOM |
| /css/style.css | 全部样式，包含控制面板、主题变量、响应式布局 |
| /js/app.js | 主应用逻辑，场景初始化、渲染循环、事件处理 |
| /js/geometry.js | 几何体创建和管理模块 |
| /js/material.js | 材质创建和动画模块 |
| /js/lights.js | 光照系统模块 |
| /js/controls.js | UI控制面板逻辑模块 |
| /js/export.js | 截图和OBJ导出模块 |

## 4. Three.js核心组件
| 组件 | 类型 | 用途 |
|------|------|------|
| Scene | THREE.Scene | 3D场景容器 |
| Camera | THREE.PerspectiveCamera | 透视相机，支持OrbitControls |
| Renderer | THREE.WebGLRenderer | WebGL渲染器，启用抗锯齿和阴影 |
| OrbitControls | 外部引入 | 鼠标轨道控制，支持旋转/缩放/平移 |
| MeshStandardMaterial | THREE.MeshStandardMaterial | PBR材质，支持金属度/粗糙度 |
| MeshPhongMaterial | THREE.MeshPhongMaterial | 备用材质选项 |
| AmbientLight | THREE.AmbientLight | 环境光，整体亮度 |
| PointLight | THREE.PointLight | 点光源，投射阴影 |
| Reflector | 外部实现 | 地面反射平面 |

## 5. 几何体数据模型
```javascript
const geometryTypes = {
    box:      { name: '立方体', params: [1.5, 1.5, 1.5] },
    sphere:   { name: '球体',   params: [1, 32, 32] },
    cylinder: { name: '圆柱体', params: [1, 1, 2, 32] },
    cone:     { name: '圆锥体', params: [1, 2, 32] },
    torus:    { name: '环面',   params: [1, 0.4, 16, 100] }
};
```

## 6. 状态管理
```javascript
const state = {
    currentGeometry: 'box',
    wireframe: false,
    metalness: 0.5,
    roughness: 0.3,
    scale: 1,
    autoRotate: true,
    animationMode: 'rotate', // rotate | float | pulse
    backgroundType: 'solid', // solid | gradient | starry
    ambientLightOn: true,
    pointLightOn: true,
    reflectionOn: true,
    multiGeometry: false,
    vertices: 0,
    faces: 0
};
```