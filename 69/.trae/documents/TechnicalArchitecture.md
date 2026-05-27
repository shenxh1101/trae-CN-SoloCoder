## 1. 架构设计

```mermaid
flowchart TD
    "A[浏览器]" --> "B[index.html 入口]"
    "B" --> "C[CSS 样式层]"
    "B" --> "D[JavaScript 逻辑层]"
    "D" --> "E[游戏状态管理]"
    "D" --> "F[拼图网格渲染]"
    "D" --> "G[事件处理系统]"
    "D" --> "H[音效播放系统]"
    "D" --> "I[localStorage 持久化]"
    "E" --> "J[当前拼图数组]"
    "E" --> "K[步数/计时器]"
    "E" --> "L[当前难度等级]"
```

## 2. 技术说明

- **前端**：原生 HTML5 + CSS3 + JavaScript（ES6+）
- **构建工具**：无需打包，单文件部署
- **后端**：无（纯前端应用）
- **数据存储**：localStorage（浏览器本地存储）
- **音效**：Web Audio API 合成音效
- **图片处理**：Canvas API 切割图片
- **动画**：CSS3 Transform + Transition
- **字体**：Google Fonts（Orbitron + Noto Sans SC）

## 3. 数据模型

### 3.1 游戏状态对象

```
gameState = {
  gridSize: 3 | 4 | 5,        // 网格大小
  tiles: number[],            // 拼图数组（0代表空格）
  moves: number,              // 当前步数
  startTime: timestamp,       // 开始时间
  elapsedTime: number,        // 已用秒数
  isPlaying: boolean,         // 是否游戏中
  isSolved: boolean,          // 是否已完成
  mode: 'image' | 'number',   // 显示模式
  soundEnabled: boolean,      // 音效开关
  hintActive: boolean,        // 提示是否激活
  customImage: string | null  // 自定义图片DataURL
}
```

### 3.2 最佳记录结构

```
bestRecords = {
  "3": { moves: number, time: number },
  "4": { moves: number, time: number },
  "5": { moves: number, time: number }
}
```

存储于 localStorage key: `puzzle_best_records`

## 4. 核心算法

### 4.1 可解性验证
- 通过计算逆序数奇偶性判断拼图是否可解
- 3×3：逆序数为偶数时可解
- 4×4/5×5：需结合空格所在行计算

### 4.2 打乱算法
- Fisher-Yates 洗牌算法打乱数组
- 打乱后验证可解性，若不可解则重新打乱

### 4.3 自动求解（BFS）
- 使用广度优先搜索找到最短解法路径
- 状态压缩为字符串存储，避免重复搜索
- 每步动画间隔 300ms 演示

### 4.4 图片切割
- Canvas 将上传图片绘制为N×N等分
- 每块通过 background-position 显示对应区域

## 5. 文件结构

```
项目根目录/
├── index.html          # 主HTML文件（含所有代码）
└── .trae/
    └── documents/
        ├── PRD.md      # 产品需求文档
        └── TechnicalArchitecture.md  # 技术架构文档
```

采用单文件架构，所有HTML、CSS、JavaScript内联在一个 index.html 中，无需构建工具即可运行。

## 6. API 接口（无）

纯前端应用，无后端API调用。所有数据通过 localStorage 持久化。

## 7. 浏览器兼容性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

依赖特性：CSS Grid、CSS Transform/Transition、ES6+、Canvas API、Web Audio API、localStorage