# 地月系统 3D 交互模拟器

基于 React + Three.js (@react-three/fiber) 的地月系统可视化项目。

## 快速开始

### 1. 安装依赖

```bash
cd "/Users/mac/code/solo coder/177"
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

访问 `http://localhost:5173` 即可查看效果。

## 功能列表

### ✅ 3D 渲染
- 🌍 **地球**：程序化生成的高分辨率纹理 + 云层动画
- 🌙 **月球**：凹凸纹理（bump map）模拟陨石坑
- ✨ **星空**：3000 个随机分布的粒子，带闪烁效果
- ☁️ **大气层**：自定义 Shader 实现菲涅尔光晕效果

### ✅ 动画效果
- 地球自身旋转
- 月球围绕地球公转（默认周期 3 秒）
- 云层缓慢滚动

### ✅ 交互控制
| 功能 | 说明 |
|------|------|
| **视角切换** | 全局视角 ↔ 月球视角 |
| **公转速度** | 0.5x / 1x / 2x / 5x 四档可调 |
| **轨道线** | 显示/隐藏月球公转轨道 |
| **大气层** | 开启/关闭地球大气层光晕 |
| **星空** | 显示/隐藏星空背景 |
| **自动旋转** | 全局视角下相机自动环绕 |
| **截图保存** | 一键保存当前视角为 PNG |

### ✅ 信息展示
- 地球/月球基本物理数据（直径、质量、距日距离等）
- 地月实时距离（按比例换算）
- 当前相机模式指示

## 项目结构

```
├── src/
│   ├── components/
│   │   ├── Earth.tsx           # 地球组件
│   │   ├── Moon.tsx            # 月球组件
│   │   ├── StarField.tsx       # 星空粒子
│   │   ├── OrbitLine.tsx       # 轨道线
│   │   ├── Lights.tsx          # 光照系统
│   │   ├── CameraController.tsx # 相机控制
│   │   ├── ControlPanel.tsx    # 控制面板
│   │   ├── InfoPanel.tsx       # 信息面板
│   │   └── CameraModeBadge.tsx # 模式标签
│   ├── store/
│   │   └── useSolarSystemStore.ts # Zustand 状态
│   ├── utils/
│   │   ├── constants.ts        # 常量定义
│   │   └── textures.ts         # 程序化纹理
│   ├── App.tsx
│   └── main.tsx
```

## 技术栈

- **框架**：React 18 + TypeScript
- **3D 渲染**：Three.js + @react-three/fiber + @react-three/drei
- **状态管理**：Zustand
- **样式**：Tailwind CSS
- **构建工具**：Vite

## 常见问题

### Q: 月球视角下相机抖动？
A: 切换到月球视角后会有短暂的平滑过渡动画，几秒后会稳定。

### Q: 截图是黑色的？
A: 确保在点击截图按钮前等待场景完全加载。

### Q: 性能不佳？
A: 可以尝试关闭星空背景来提升性能。
