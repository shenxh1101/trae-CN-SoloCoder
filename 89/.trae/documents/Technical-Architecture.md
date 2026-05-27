## 1. 架构设计
纯前端项目，无需后端服务。

```mermaid
flowchart TD
    "index.html" --> "HTML 结构 + 画布"
    "style.css" --> "视觉样式 + 动画效果"
    "game.js" --> "游戏核心逻辑"
    "audio.js" --> "音效系统"
    "localStorage" --> "最高分持久化"
```

## 2. 技术说明
- 前端：原生 HTML5 + CSS3 + JavaScript (ES6+)
- 渲染：HTML5 Canvas 2D API
- 数据持久化：localStorage
- 音效：Web Audio API（程序生成音效，无需外部资源）

## 3. 目录结构
```
/
├── index.html          # 游戏主页面
├── style.css           # 游戏样式
├── game.js             # 游戏核心逻辑
├── audio.js            # 音效系统
└── .trae/documents/    # 项目文档
```

## 4. 核心数据结构

### Snake 对象
```javascript
{
  body: [{x, y}, ...],   // 蛇身坐标数组
  direction: {x, y},      // 移动方向
  speed: number,          // 当前速度
  boosted: boolean,       // 是否加速
  boostTimer: number,     // 加速剩余时间
  color: string,          // 蛇身颜色
  alive: boolean,         // 是否存活
}
```

### Food 对象
```javascript
{
  position: {x, y},
  type: 'normal' | 'special',
}
```

### Obstacle 对象
```javascript
{
  position: {x, y},
  changeTimer: number,    // 位置改变倒计时
}
```

## 5. 游戏循环
- 使用 requestAnimationFrame 实现游戏循环
- 固定时间步长：基于蛇速度动态调整
- 每帧：处理输入 → 更新蛇位置 → 检测碰撞 → 渲染画面

## 6. 碰撞检测
- 蛇头 vs 蛇身：AABB 碰撞
- 蛇头 vs 食物：AABB 碰撞
- 蛇头 vs 障碍物：AABB 碰撞
- 蛇头 vs 墙壁：根据设置判断

## 7. 按键映射
| 操作 | 玩家1 | 玩家2 |
|------|-------|-------|
| 上 | W | ↑ |
| 下 | S | ↓ |
| 左 | A | ← |
| 右 | D | → |
| 暂停 | Space | Space |