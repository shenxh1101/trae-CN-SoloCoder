## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "React 应用"
        "游戏主页面"
        "设置页面"
        "结果页面"
    end

    subgraph "核心逻辑层"
        "游戏引擎模块"
        "物体检测模块"
        "语音模块"
        "计分模块"
        "多人模式模块"
    end

    subgraph "数据层"
        "localStorage"
        "游戏状态管理(Zustand)"
    end

    subgraph "外部服务"
        "摄像头API"
        "TensorFlow.js COCO-SSD"
        "Web Speech API"
    end

    "React 应用" --> "游戏引擎模块"
    "游戏引擎模块" --> "物体检测模块"
    "游戏引擎模块" --> "计分模块"
    "游戏引擎模块" --> "语音模块"
    "游戏引擎模块" --> "多人模式模块"
    "物体检测模块" --> "TensorFlow.js COCO-SSD"
    "物体检测模块" --> "摄像头API"
    "语音模块" --> "Web Speech API"
    "多人模式模块" --> "localStorage"
    "游戏引擎模块" --> "游戏状态管理(Zustand)"
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript + Tailwind CSS + Vite
- **初始化工具**：vite-init (react-ts 模板)
- **状态管理**：Zustand
- **物体检测**：TensorFlow.js + COCO-SSD 模型（浏览器端推理）
- **语音合成**：Web Speech API (SpeechSynthesis)
- **摄像头**：MediaDevices API (getUserMedia)
- **数据持久化**：localStorage
- **后端**：无（纯前端应用）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 游戏主页（含开始界面和游戏进行界面） |
| `/settings` | 设置页面（难度、物体选择、语音开关） |
| `/result` | 游戏结果页面（准确率报告、统计、排行榜） |

## 4. 核心模块设计

### 4.1 物体检测模块

```typescript
interface DetectionResult {
  label: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

interface ObjectDetector {
  load(): Promise<void>;
  detect(video: HTMLVideoElement): Promise<DetectionResult[]>;
  dispose(): void;
}
```

- 使用 `@tensorflow/tfjs` + `@tensorflow-models/coco-ssd`
- 检测频率根据难度调节：简单(1000ms)、普通(500ms)、困难(200ms)
- 过滤置信度低于阈值的检测结果（简单:0.3, 普通:0.5, 困难:0.65）

### 4.2 游戏引擎模块

```typescript
interface GameState {
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'ended';
  currentTarget: string | null;
  score: number;
  combo: number;
  timeRemaining: number;
  difficulty: 'easy' | 'normal' | 'hard';
  selectedObjects: string[];
  voiceEnabled: boolean;
  detectionResults: DetectionResult[];
  matchHistory: MatchRecord[];
  players: Player[];
  currentPlayerIndex: number;
}

interface MatchRecord {
  target: string;
  matched: boolean;
  timeTaken: number; // ms
  timestamp: number;
}

interface Player {
  id: string;
  name: string;
  score: number;
  matchHistory: MatchRecord[];
  fastestTime: number;
  accuracy: number;
}
```

### 4.3 语音模块

- 使用 `window.speechSynthesis` API
- 语言设置为中文（zh-CN）
- 在目标物体切换时自动播报物体名称
- 可通过设置开关控制

### 4.4 多人模式模块

- 玩家管理：添加/删除玩家，设置名称
- 轮流机制：每位玩家独立进行60秒挑战
- 成绩存储结构：

```typescript
interface StoredRecord {
  id: string;
  playerName: string;
  score: number;
  accuracy: number;
  fastestTime: number;
  difficulty: string;
  timestamp: number;
  matchHistory: MatchRecord[];
}
```

## 5. 数据模型

### 5.1 localStorage 数据结构

```json
{
  "ai-tracker-records": [
    {
      "id": "uuid",
      "playerName": "玩家1",
      "score": 150,
      "accuracy": 0.85,
      "fastestTime": 1200,
      "difficulty": "normal",
      "timestamp": 1700000000000,
      "matchHistory": [
        {
          "target": "cup",
          "matched": true,
          "timeTaken": 2500,
          "timestamp": 1700000001000
        }
      ]
    }
  ]
}
```

### 5.2 难度参数配置

| 参数 | 简单 | 普通 | 困难 |
|------|------|------|------|
| 检测间隔 | 1000ms | 500ms | 200ms |
| 置信度阈值 | 0.3 | 0.5 | 0.65 |
| 目标切换延迟 | 1500ms | 800ms | 300ms |
| 游戏时长 | 60s | 60s | 60s |

## 6. 关键技术决策

1. **COCO-SSD 模型选择**：COCO-SSD 是 TensorFlow.js 提供的轻量级物体检测模型，支持浏览器端实时推理，可识别80种COCO数据集类别，包含我们所需的10种物体。
2. **Canvas叠加渲染**：使用 Canvas 在视频流上叠加绘制边界框和标签，避免DOM操作的性能开销。
3. **请求动画帧**：使用 requestAnimationFrame 驱动检测循环，确保与浏览器渲染周期同步。
4. **模型预加载**：在游戏开始前加载模型，避免游戏过程中的卡顿。
