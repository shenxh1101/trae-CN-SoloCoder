## 1. 架构设计

```mermaid
flowchart TB
    subgraph Frontend["前端 (React + TypeScript)
        UI["UI组件层"]
        State["状态管理层 (Zustand)"]
        Canvas["Canvas渲染层"]
        Utils["工具函数层"]
    end

    subgraph Data["数据存储层"]
        LS["localStorage持久化"]
        MEM["内存状态"]
    end

    subgraph External["浏览器API"]
        CA["Canvas API"]
        MR["MediaRecorder API"]
        FS["File System API"]
        TO["Touch Events"]
    end

    UI --> State
    State --> Canvas
    Canvas --> CA
    UI --> MR
    UI --> FS
    UI --> TO
    State --> LS
    State --> MEM
    Canvas --> Utils
```

## 2. 技术描述

- **前端框架**: React@18 + TypeScript
- **构建工具**: Vite@5
- **样式方案**: TailwindCSS@3
- **状态管理**: Zustand@4
- **图标库**: Lucide React
- **渲染引擎**: HTML5 Canvas API
- **录制功能**: MediaRecorder API
- **数据持久化**: localStorage
- **无后端**: 纯前端应用，无需后端服务

## 3. 项目结构

```
src/
├── components/
│   ├── Canvas/
│   │   ├── DrawingCanvas.tsx      # 主画布组件
│   │   ├── CanvasLayer.tsx       # 单图层画布
│   │   └── SymmetryRenderer.ts   # 对称渲染器
│   ├── Toolbar/
│   │   ├── Toolbar.tsx          # 主工具栏
│   │   ├── ToolButton.tsx       # 工具按钮
│   │   └── ColorPicker.tsx     # 颜色选择器
│   │   └── Slider.tsx        # 通用滑块
│   ├── LayerPanel/
│   │   ├── LayerPanel.tsx       # 图层面板
│   │   └── LayerItem.tsx      # 图层条目
│   ├── ControlPanel/
│   │   ├── ControlPanel.tsx     # 控制面板
│   │   ├── SymmetryModeSelector.tsx # 对称模式选择器
│   │   └── BackgroundSettings.tsx # 背景设置
│   ├── Recorder/
│   │   ├── RecorderPanel.tsx   # 录制面板
│   │   └── PlaybackModal.tsx   # 回放弹窗
│   └── Export/
│       └── ExportModal.tsx       # 导出弹窗
├── hooks/
│   ├── useCanvas.ts           # Canvas操作hook
│   ├── useDrawing.ts         # 绘制逻辑hook
│   ├── useHistory.ts         # 撤销/重做hook
│   ├── useRecorder.ts        # 录制功能hook
│   └── useLocalStorage.ts   # 本地存储hook
├── store/
│   ├── useStore.ts           # Zustand全局状态
├── utils/
│   ├── symmetry.ts          # 对称计算工具
│   ├── canvas.ts           # Canvas工具函数
│   ├── export.ts           # 导出工具
│   └── types.ts            # 类型定义
├── pages/
│   └── App.tsx             # 主页面
├── main.tsx                 # 入口文件
└── index.css              # 全局样式
```

## 4. 核心数据模型

### 4.1 类型定义

```typescript
// 绘图工具类型
type ToolType = 'brush' | 'line' | 'rect' | 'circle' | 'eyedropper';

// 对称模式
type SymmetryMode = 'horizontal' | 'vertical' | 'center';

// 背景类型
type BackgroundType = 'solid' | 'grid';

// 画笔属性
interface BrushSettings {
  color: string;
  size: number;
  opacity: number;
}

// 图层
interface Layer {
  id: string;
  name: string;
  visible: boolean;
  symmetryEnabled: boolean;
  imageData: string; // base64
}

// 绘制路径点
interface Point {
  x: number;
  y: number;
}

// 绘制操作（用于历史记录）
interface DrawAction {
  type: ToolType;
  points: Point[];
  brush: BrushSettings;
  layerId: string;
  timestamp: number;
}

// 录制帧
interface RecordFrame {
  timestamp: number;
  action: DrawAction;
}

// 应用状态
interface AppState {
  currentTool: ToolType;
  symmetryMode: SymmetryMode;
  brush: BrushSettings;
  layers: Layer[];
  activeLayerId: string;
  background: {
    type: BackgroundType;
    color: string;
    gridColor: string;
    gridSize: number;
  };
  baseImage: string | null;
  baseImageOpacity: number;
  isRecording: boolean;
  recordedFrames: RecordFrame[];
  history: DrawAction[];
  historyIndex: number;
}
```

### 4.2 状态管理结构

```typescript
// Zustand Store
const useStore = create<AppState & Actions>((set, get) => ({
  // 状态...
  // 动作:
  setTool: (tool: ToolType) => set({ currentTool: tool }),
  setSymmetryMode: (mode: SymmetryMode) => set({ symmetryMode: mode }),
  setBrush: (brush: Partial<BrushSettings>) => set({ brush: { ...get().brush, ...brush } }),
  addLayer: () => set({ layers: [...get().layers, newLayer] }),
  removeLayer: (id: string) => set({ layers: get().layers.filter(l => l.id !== id) }),
  toggleLayerSymmetry: (id: string) => set({ ... }),
  undo: () => set({ historyIndex: Math.max(0, get().historyIndex - 1) }),
  redo: () => set({ historyIndex: Math.min(get().history.length, get().historyIndex + 1) }),
  saveToStorage: () => localStorage.setItem('symmetry-canvas', JSON.stringify(get())),
  loadFromStorage: () => { ... },
}));
```

## 5. 核心算法

### 5.1 对称点计算

```typescript
// 计算对称点
function getSymmetricPoints(point: Point, mode: SymmetryMode, canvasWidth: number, canvasHeight: number): Point[] {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  
  switch (mode) {
    case 'horizontal':
      return [{ x: canvasWidth - point.x, y: point.y }];
    case 'vertical':
      return [{ x: point.x, y: canvasHeight - point.y }];
    case 'center':
      return [
        { x: canvasWidth - point.x, y: point.y },
        { x: point.x, y: canvasHeight - point.y },
        { x: canvasWidth - point.x, y: canvasHeight - point.y }
      ];
    default:
      return [];
  }
}
```

### 5.2 绘制流程

```
用户绘制 → 获取鼠标/触摸点 → 计算对称点 → 同时绘制原点和对称点 → 保存绘制操作 → 记录到历史栈 → 更新图层数据 → 自动保存到localStorage
```

## 6. 性能优化

1. **分层渲染**: 每个图层独立Canvas，合成时统一绘制
2. **离屏Canvas**: 使用离屏Canvas进行预渲染
3. **节流处理**: 触摸/鼠标移动事件节流处理
4. **历史记录优化**: 使用ImageData快照而非逐点存储
5. **防抖保存**: localStorage保存使用防抖优化
6. **懒加载**: 大图导入使用渐进式加载

## 7. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主画板页面 |

（单页应用，无多路由需求）
