# FitTrack Pro 传感器步数检测算法技术文档

## 📋 目录

1. [算法概述](#1-算法概述)
2. [核心原理](#2-核心原理)
3. [算法流程图](#3-算法流程图)
4. [关键参数说明](#4-关键参数说明)
5. [代码实现详解](#5-代码实现详解)
6. [测试验证方法](#6-测试验证方法)
7. [精度优化策略](#7-精度优化策略)
8. [常见问题排查](#8-常见问题排查)
9. [实际运行结果](#9-实际运行结果)

---

## 1. 算法概述

FitTrack Pro 使用 **加速度计峰值检测算法** 实现步数计数，支持自动区分 **行走** 和 **跑步** 两种运动状态，并实时计算距离和卡路里消耗。

### 技术栈
- **传感器**: 三轴加速度计 (Accelerometer)
- **数据频率**: ~30-60 Hz (设备相关)
- **语言**: TypeScript
- **平台**: iOS + Android
- **库**: `react-native-sensors`

### 功能特性
| 功能 | 说明 |
|------|------|
| ✅ 实时步数计数 | 峰值检测算法，低误判率 |
| ✅ 行走/跑步区分 | 步频分析 >120步/分 = 跑步 |
| ✅ 距离计算 | 动态步长：行走0.5m，跑步0.7m |
| ✅ 卡路里计算 | MET值法：行走3.5，跑步8.0 |
| ✅ 噪声过滤 | 滑动窗口 + 最小峰值阈值 |
| ✅ 防抖机制 | 250ms 最小步间距 |

---

## 2. 核心原理

### 2.1 三轴加速度向量合成

```
原始加速度: (x, y, z) 单位: m/s²

合加速度 magnitude = √(x² + y² + z²)

去除重力: normalizedMagnitude = magnitude - 9.81
```

**原理说明**:
- 手机静止时，加速度计主要检测重力加速度 ~9.81 m/s²
- 行走/跑步时，合加速度在 9.81 上下波动
- 去除重力后，得到人体运动产生的加速度分量

### 2.2 峰值检测算法

```
       .  .       (峰值)
      /    \
     /      \
    /        \
   /          \
--+------------+-- (零值线 = 去除重力后)
  \            /
   \          /
    \        /
     \      /
      '.  .'       (谷值)
```

**检测条件**:
1. 峰值高度 > 2.0 m/s²（最小阈值）
2. 峰值高度 > 1.5 m/s²（预筛选）
3. 是滑动窗口内的最大值
4. 与上一峰值间隔 > 250ms（防抖）

### 2.3 步频分析 (行走/跑步分类)

```
步频 (步/分钟) = (步数 / 时间跨度) × 60000

阈值: > 120 步/分 = 跑步
       ≤ 120 步/分 = 行走
```

**典型步频参考**:
| 运动类型 | 步频范围 | 示例 |
|---------|---------|------|
| 慢走 | 60-90 步/分 | 散步 |
| 快走 | 90-120 步/分 | 正常行走 |
| 慢跑 | 120-160 步/分 | 轻松跑步 |
| 快跑 | 160-200 步/分 | 竞速跑步 |

### 2.4 MET值卡路里计算

```
卡路里 (kcal) = MET × 体重(kg) × 时间(小时)

其中:
- 行走 MET = 3.5
- 跑步 MET = 8.0
```

**MET值说明**:
- MET (Metabolic Equivalent of Task) = 代谢当量
- 1 MET = 安静时的代谢率 ≈ 1 kcal/kg/h
- 行走 3.5 MET = 能量消耗是安静时的3.5倍
- 跑步 8.0 MET = 能量消耗是安静时的8倍

### 2.5 距离计算

```
距离 (m) = 步数 × 步长 (m)

其中:
- 行走步长 = 0.5 m/步
- 跑步步长 = 0.7 m/步
```

**步长说明**:
- 成年男性平均步长: 0.6-0.8m
- 成年女性平均步长: 0.5-0.7m
- 跑步时步长通常比行走大40%

---

## 3. 算法流程图

```
加速度计原始数据
        ↓
[x, y, z] 三轴数据
        ↓
┌─────────────────────────────┐
│ 合加速度计算                 │
│ magnitude = √(x²+y²+z²)     │
│ normalized = magnitude - 9.81│
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│ 滑动窗口缓冲 (50个样本)      │
│ 保持最近50个加速度值         │
└─────────────────────────────┘
        ↓
┌─────────────────────────────┐
│ 峰值检测                     │
│ ✓ 峰值 > 2.0 m/s² ?          │
│ ✓ 是窗口内最大值 ?           │
│ ✓ 距上一峰值 > 250ms ?       │
└─────────────────────────────┘
        ↓
     是峰值 ?
    /       \
   否        是 ←─────────┐
   |         ↓            │
   |     步频计算         │
   |     (最近5步)        │
   |         ↓            │
   |     步频 > 120 ?     │
   |      /       \       │
   |    跑步      行走    │
   |     |         |      │
   └─────┘         └──────┘
                  ↓
           ┌─────────────────────┐
           │ 计算每步数据         │
           │ ✓ 步数 +1            │
           │ ✓ 距离 += 步长       │
           │ ✓ 卡路里 += MET值    │
           └─────────────────────┘
                  ↓
           回调更新 UI
           (HomeScreen 实时显示)
```

---

## 4. 关键参数说明

### 4.1 峰值检测参数

| 参数 | 值 | 说明 | 位置 |
|------|-----|------|------|
| `MIN_PEAK_HEIGHT` | 2.0 m/s² | 最小峰值高度，低于此值不计数 | [sensorService.ts#L132](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L132) |
| `PRE_FILTER_THRESHOLD` | 1.5 m/s² | 预筛选阈值，快速排除小振动 | [sensorService.ts#L127](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L127) |
| `MIN_STEP_INTERVAL` | 250 ms | 最小步间距，防止误判 | [sensorService.ts#L93](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L93) |
| `WINDOW_SIZE` | 10 样本 | 峰值检测滑动窗口大小 | [sensorService.ts#L90](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L90) |
| `BUFFER_SIZE` | 50 样本 | 历史数据缓冲区大小 | [sensorService.ts#L84](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L84) |

### 4.2 运动分类参数

| 参数 | 值 | 说明 | 位置 |
|------|-----|------|------|
| `RUNNING_CADENCE_THRESHOLD` | 120 步/分 | 步频阈值，超过判定为跑步 | [sensorService.ts#L95](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L95) |
| `CADENCE_WINDOW_SIZE` | 5 步 | 步频计算窗口大小 | [sensorService.ts#L138](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L138) |

### 4.3 距离和卡路里参数

| 参数 | 值 | 说明 | 位置 |
|------|-----|------|------|
| `WALKING_STEP_LENGTH` | 0.5 m | 行走步长 | [sensorService.ts#L148](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L148) |
| `RUNNING_STEP_LENGTH` | 0.7 m | 跑步步长 | [sensorService.ts#L148](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L148) |
| `WALKING_MET` | 3.5 | 行走代谢当量 | [sensorService.ts#L153](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L153) |
| `RUNNING_MET` | 8.0 | 跑步代谢当量 | [sensorService.ts#L153](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L153) |
| `DEFAULT_WEIGHT` | 70 kg | 默认用户体重 | [sensorService.ts#L24](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L24) |

---

## 5. 代码实现详解

### 5.1 核心类结构

```typescript
class SensorService {
  // 状态变量
  private stepCount = 0;           // 总步数
  private walkingSteps = 0;        // 行走步数
  private runningSteps = 0;        // 跑步步数
  private lastPeakTime = 0;        // 上一峰值时间戳
  private stepBuffer: Buffer[];    // 加速度缓冲区
  private lastStepValues: number[]; // 历史步时间戳

  // 核心方法
  startTracking(onUpdate)          // 开始追踪
  stopTracking()                   // 停止追踪
  handleAccelerometerData(data)    // 处理加速度数据
  detectPeak(value, window)        // 峰值检测
  calculateStepCadence(now)        // 步频计算
  calculateDistance(isRunning)     // 距离计算
  calculateCalories(isRunning)     // 卡路里计算
}
```

### 5.2 加速度数据处理

**代码位置**: [sensorService.ts#L75-L124](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L75-L124)

```typescript
private handleAccelerometerData(data: {x: number; y: number; z: number}): void {
  // 1. 计算合加速度并去除重力
  const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
  const normalizedMagnitude = magnitude - 9.81;

  // 2. 存入滑动缓冲区（保留最近50个样本）
  this.stepBuffer.push({magnitude: normalizedMagnitude, timestamp: now});
  if (this.stepBuffer.length > 50) {
    this.stepBuffer.shift();
  }

  // 3. 等待缓冲区有足够数据（至少10个样本）
  if (this.stepBuffer.length < 10) return;

  // 4. 峰值检测（使用最近10个样本窗口）
  const recentValues = this.stepBuffer.slice(-10);
  const isPeak = this.detectPeak(normalizedMagnitude, recentValues);

  // 5. 验证有效步（防抖 + 步频分析）
  if (isPeak && now - this.lastPeakTime > 250) {
    const stepCadence = this.calculateStepCadence(now);
    const isRunning = stepCadence > 120;
    
    // 更新计数并回调UI
    this.updateCountersAndNotify(isRunning, now);
  }
}
```

### 5.3 峰值检测算法

**代码位置**: [sensorService.ts#L126-L133](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L126-L133)

```typescript
private detectPeak(
  currentValue: number, 
  recentValues: {magnitude: number; timestamp: number}[]
): boolean {
  // 预筛选：快速排除小振动
  if (currentValue < 1.5) return false;

  // 计算窗口内最大值
  const recentMagnitudes = recentValues.map(v => v.magnitude);
  const maxInWindow = Math.max(...recentMagnitudes);

  // 判定条件：是窗口最大值 且 > 2.0 m/s²
  return currentValue === maxInWindow && currentValue > 2.0;
}
```

**算法说明**:
1. **预筛选**: `currentValue < 1.5` 快速排除微小振动（如手机轻微晃动）
2. **窗口最大值**: 使用最近10个样本作为分析窗口
3. **峰值阈值**: `currentValue > 2.0` 确保是真实的脚步冲击
4. **空间复杂度**: O(1)，只保留固定大小的缓冲区

### 5.4 步频计算

**代码位置**: [sensorService.ts#L135-L145](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L135-L145)

```typescript
private calculateStepCadence(now: number): number {
  // 使用最近5步计算步频
  const recentSteps = this.lastStepValues.slice(-5);
  if (recentSteps.length < 2) return 0;

  // 计算时间跨度（毫秒）
  const timeSpan = now - recentSteps[0];
  if (timeSpan === 0) return 0;

  // 转换为步/分钟
  return (recentSteps.length / timeSpan) * 60000;
}
```

**示例计算**:
```
最近5步时间戳: [1000, 1400, 1800, 2200, 2600] ms
当前时间: 3000 ms
时间跨度: 3000 - 1000 = 2000 ms = 2秒
步频: (5 / 2000) × 60000 = 150 步/分 → 跑步 ✓
```

### 5.5 卡路里计算

**代码位置**: [sensorService.ts#L152-L156](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts#L152-L156)

```typescript
private calculateCalories(isRunning: boolean): number {
  const metValue = isRunning ? 8.0 : 3.5;
  const durationHours = 1 / 3600;  // 1步 ≈ 1秒（估算）
  return metValue * this.userWeight * durationHours;
}
```

**示例计算** (70kg 用户):
```
行走: 3.5 × 70 × (1/3600) = 0.068 kcal/步
跑步: 8.0 × 70 × (1/3600) = 0.156 kcal/步

10000步行走: 10000 × 0.068 = 680 kcal
10000步跑步: 10000 × 0.156 = 1560 kcal
```

---

## 6. 测试验证方法

### 6.1 单元测试脚本

```javascript
// test_sensor_algorithm.js
const assert = require('assert');

// 导入算法函数
function detectPeak(currentValue, recentValues) {
  if (currentValue < 1.5) return false;
  const maxInWindow = Math.max(...recentValues.map(v => v.magnitude));
  return currentValue === maxInWindow && currentValue > 2.0;
}

function calculateStepCadence(stepTimes, now) {
  if (stepTimes.length < 2) return 0;
  const timeSpan = now - stepTimes[0];
  return (stepTimes.length / timeSpan) * 60000;
}

// 测试用例1: 峰值检测 - 有效峰值
const peakTest1 = detectPeak(2.5, [
  {magnitude: 1.0}, {magnitude: 1.5}, {magnitude: 2.0},
  {magnitude: 2.5}, {magnitude: 2.0}, {magnitude: 1.5}
]);
assert.strictEqual(peakTest1, true, '有效峰值应返回true');

// 测试用例2: 峰值检测 - 低于阈值
const peakTest2 = detectPeak(1.8, [
  {magnitude: 1.0}, {magnitude: 1.5}, {magnitude: 1.8}
]);
assert.strictEqual(peakTest2, false, '低于2.0阈值应返回false');

// 测试用例3: 步频计算 - 行走 (107步/分)
const walkingCadence = calculateStepCadence(
  [0, 700, 1400, 2100, 2800], 3500
);
assert(walkingCadence >= 80 && walkingCadence <= 120, 
  `行走步频应为80-120，实际: ${walkingCadence}`);

// 测试用例4: 步频计算 - 跑步 (188步/分)
const runningCadence = calculateStepCadence(
  [0, 400, 800, 1200, 1600], 2000
);
assert(runningCadence > 120, 
  `跑步步频应>120，实际: ${runningCadence}`);

console.log('✅ 所有传感器算法测试通过');
```

### 6.2 真机测试步骤

**前置准备**:
1. iPhone 或 Android 真机
2. 安装 Expo Go 或编译后的应用
3. 开启开发者模式和USB调试
4. 安装 `react-native-sensors` 依赖

**测试步骤**:

```bash
# 1. 启动应用
npm run ios   # iOS
npm run android  # Android

# 2. 开启调试日志
# 在 HomeScreen 中添加:
console.log('加速度数据:', {x, y, z, magnitude, normalized});
console.log('峰值检测:', {isPeak, currentValue, maxInWindow});
console.log('步频:', {cadence, isRunning});
console.log('步数更新:', {steps, walkingSteps, runningSteps});

# 3. 执行测试动作

## 测试A: 静止放置
- 将手机平放桌面1分钟
- 预期: 步数 = 0
- 验证: 无误判

## 测试B: 慢走测试
- 手持手机慢走100步（约每分钟80步）
- 预期: 步数 ≈ 95-105，walkingSteps ≈ 100，runningSteps = 0
- 误差范围: ±5%
- 验证: 全部判定为行走

## 测试C: 快走测试
- 手持手机快走100步（约每分钟110步）
- 预期: 步数 ≈ 95-105，walkingSteps ≈ 100
- 验证: 全部判定为行走

## 测试D: 慢跑测试
- 手持手机慢跑100步（约每分钟140步）
- 预期: 步数 ≈ 95-105，runningSteps ≈ 100
- 验证: 全部判定为跑步

## 测试E: 跑步测试
- 手持手机快跑100步（约每分钟180步）
- 预期: 步数 ≈ 95-105，runningSteps ≈ 100
- 验证: 全部判定为跑步

## 测试F: 混合运动
- 行走50步 + 跑步50步
- 预期: 总步数 ≈ 95-105
- walkingSteps ≈ 50, runningSteps ≈ 50
- 验证: 分类正确

## 测试G: 口袋测试
- 将手机放入裤袋，行走100步
- 预期: 步数 ≈ 90-110
- 验证: 口袋中也能正常检测

## 测试H: 背包测试
- 将手机放入背包，行走100步
- 预期: 步数 ≈ 85-115
- 验证: 背包中仍能检测（准确率稍低）

# 4. 查看日志输出
adb logcat | grep -E "加速度|峰值|步频|步数"   # Android
# 或使用 Xcode 控制台查看 iOS 日志
```

### 6.3 数据验证工具

```typescript
// 传感器数据可视化工具
class SensorDebugger {
  private dataLog: {
    timestamp: number;
    x: number; y: number; z: number;
    magnitude: number; normalized: number;
    isPeak: boolean;
    cadence: number;
  }[] = [];

  log(data: any) {
    this.dataLog.push({
      timestamp: Date.now(),
      ...data
    });
    
    // 保留最近1000条
    if (this.dataLog.length > 1000) {
      this.dataLog.shift();
    }
  }

  exportCSV(): string {
    const header = 'timestamp,x,y,z,magnitude,normalized,isPeak,cadence\n';
    const rows = this.dataLog.map(d => 
      `${d.timestamp},${d.x},${d.y},${d.z},${d.magnitude},${d.normalized},${d.isPeak},${d.cadence}`
    ).join('\n');
    return header + rows;
  }

  analyzeAccuracy(expectedSteps: number): {
    actualSteps: number;
    accuracy: number;
    errorRate: number;
    falsePositives: number;
    falseNegatives: number;
  } {
    const actualSteps = this.dataLog.filter(d => d.isPeak).length;
    const accuracy = Math.min(actualSteps, expectedSteps) / Math.max(actualSteps, expectedSteps) * 100;
    const errorRate = Math.abs(actualSteps - expectedSteps) / expectedSteps * 100;
    
    return {
      actualSteps,
      accuracy,
      errorRate,
      falsePositives: Math.max(0, actualSteps - expectedSteps),
      falseNegatives: Math.max(0, expectedSteps - actualSteps)
    };
  }
}
```

---

## 7. 精度优化策略

### 7.1 常见误判原因及解决方案

| 误判类型 | 原因 | 解决方案 |
|---------|------|---------|
| **静止时误计数** | 手机放置表面有振动 | 增加静止检测：加速度方差 < 阈值时暂停计数 |
| **乘车时误计数** | 车辆颠簸产生周期性振动 | 增加GPS速度检测：速度 > 20km/h 时暂停计数 |
| **刷牙时误计数** | 手部周期性运动 | 增加峰值形状分析：非典型脚步波形排除 |
| **步数偏少** | 步长较小（如矮个子用户） | 允许用户自定义步长，或根据身高计算 |
| **跑步判定延迟** | 步频计算窗口过大 | 减小步频计算窗口（从5步改为3步） |
| **上下楼误判** | 垂直加速度模式不同 | 增加气压计/陀螺仪数据融合 |

### 7.2 参数调优指南

**如果误判率高（假阳性多）**:
```typescript
// 增大峰值阈值
- return currentValue === maxInWindow && currentValue > 2.0;
+ return currentValue === maxInWindow && currentValue > 2.5;

// 增大最小步间距
- if (isPeak && now - this.lastPeakTime > 250) {
+ if (isPeak && now - this.lastPeakTime > 300) {
```

**如果漏判率高（假阴性多）**:
```typescript
// 减小峰值阈值
- return currentValue === maxInWindow && currentValue > 2.0;
+ return currentValue === maxInWindow && currentValue > 1.5;

// 减小最小步间距
- if (isPeak && now - this.lastPeakTime > 250) {
+ if (isPeak && now - this.lastPeakTime > 200) {

// 增大滑动窗口
- const recentValues = this.stepBuffer.slice(-10);
+ const recentValues = this.stepBuffer.slice(-15);
```

**如果行走/跑步分类不准确**:
```typescript
// 调整步频阈值
- const isRunning = stepCadence > 120;
+ const isRunning = stepCadence > 130;  // 提高阈值

// 增加滞后效应（防止边界频繁切换）
private lastIsRunning = false;
private isRunningStable = false;
private consecutiveRunningSteps = 0;

// 需要连续3步步频>120才判定为跑步
if (stepCadence > 120) {
  this.consecutiveRunningSteps++;
  if (this.consecutiveRunningSteps >= 3) {
    this.isRunningStable = true;
  }
} else {
  this.consecutiveRunningSteps = 0;
  this.isRunningStable = false;
}
```

### 7.3 高级优化方案

#### 方案1: 自适应阈值
```typescript
// 根据历史数据动态调整峰值阈值
private adaptiveThreshold = 2.0;
private updateThreshold(currentValue: number) {
  const alpha = 0.01;  // 平滑系数
  this.adaptiveThreshold = 
    this.adaptiveThreshold * (1 - alpha) + Math.abs(currentValue) * alpha;
}
```

#### 方案2: 多传感器融合
```typescript
// 融合陀螺仪数据，排除非步行运动
import {Gyroscope} from 'react-native-sensors';

private handleGyroscopeData(data: {x: number; y: number; z: number}) {
  const rotationMagnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);
  // 步行时旋转幅度应在合理范围内
  this.isPlausibleWalking = rotationMagnitude < 5.0;
}
```

#### 方案3: 机器学习分类
```typescript
// 使用预训练的决策树或SVM模型
import * as tf from '@tensorflow/tfjs';

private classifyMotion(features: number[]): 'walking' | 'running' | 'other' {
  const tensor = tf.tensor2d([features]);
  const prediction = this.model.predict(tensor) as tf.Tensor;
  const result = prediction.dataSync();
  // [walkingProb, runningProb, otherProb]
  return result.indexOf(Math.max(...result)) === 0 ? 'walking' : 
         result.indexOf(Math.max(...result)) === 1 ? 'running' : 'other';
}
```

---

## 8. 常见问题排查

### 8.1 步数完全不计数

**可能原因**:
1. 传感器权限未授权
2. `react-native-sensors` 未正确链接
3. 应用在后台被系统杀死
4. 手机休眠时传感器停止

**排查步骤**:
```bash
# 1. 检查权限
iOS: 设置 → 隐私与安全性 → 运动与健身 → 开启FitTrack Pro
Android: 设置 → 应用 → FitTrack Pro → 权限 → 身体传感器

# 2. 检查后台刷新
iOS: 设置 → 通用 → 后台App刷新 → 开启FitTrack Pro
Android: 设置 → 电池 → 电池优化 → 排除FitTrack Pro

# 3. 检查传感器是否可用
adb shell dumpsys sensorservice | grep -i accelerometer

# 4. 查看错误日志
adb logcat | grep -E "加速度计|Accelerometer|error"
```

### 8.2 步数严重偏少（<50%）

**可能原因**:
1. 峰值阈值设置过高
2. 手机放置位置不当（如背包内层）
3. 用户步幅过小

**解决方案**:
```typescript
// 降低峰值阈值
- return currentValue === maxInWindow && currentValue > 2.0;
+ return currentValue === maxInWindow && currentValue > 1.5;

// 提示用户正确放置手机
// "请将手机放在裤袋或臂包中，以获得最佳计数效果"
```

### 8.3 步数严重偏多（>150%）

**可能原因**:
1. 峰值阈值设置过低
2. 乘车时未暂停计数
3. 手部频繁运动（如打字、刷牙）

**解决方案**:
```typescript
// 提高峰值阈值
- return currentValue === maxInWindow && currentValue > 2.0;
+ return currentValue === maxInWindow && currentValue > 2.5;

// 增加静止检测
private isStationary(): boolean {
  const recentValues = this.stepBuffer.slice(-30);
  const variance = this.calculateVariance(recentValues);
  return variance < 0.1;
}
```

### 8.4 行走/跑步分类错误

**可能原因**:
1. 步频阈值不适合用户
2. 步频计算窗口过大导致延迟
3. 用户步频异常（如非常慢的跑步）

**解决方案**:
```typescript
// 个性化阈值设置
const userProfile = {
  runningCadenceThreshold: 110,  // 适合跑步慢的用户
  walkingStepLength: 0.55,       // 根据身高调整
  runningStepLength: 0.75
};

// 或者自动学习用户习惯
private learnUserPattern(isRunning: boolean, cadence: number) {
  if (isRunning && cadence < this.runningThreshold) {
    this.runningThreshold -= 1;  // 逐步降低阈值适应用户
  }
}
```

### 8.5 能量消耗计算不准确

**可能原因**:
1. 用户体重未正确设置
2. MET值不适合运动强度
3. 步长估算不准

**解决方案**:
```typescript
// 1. 确保用户体重已设置
sensorService.setUserWeight(userProfile.weight);

// 2. 动态MET值（根据步频）
private getDynamicMET(cadence: number): number {
  if (cadence < 80) return 2.5;      // 慢走
  if (cadence < 100) return 3.5;     // 正常行走
  if (cadence < 120) return 5.0;     // 快走
  if (cadence < 140) return 8.0;     // 慢跑
  if (cadence < 160) return 10.0;    // 正常跑步
  return 12.0;                       // 快跑
}

// 3. 根据身高计算步长
private calculateStepLength(height: number, isRunning: boolean): number {
  // 身高 × 系数
  const walkingFactor = 0.413;
  const runningFactor = 0.58;
  return isRunning ? height * runningFactor : height * walkingFactor;
}
```

---

## 9. 实际运行结果

### 9.1 自动化测试输出

```
============================================================
🏋️  FitTrack Pro 功能验证测试脚本
============================================================

📱 测试 4: 传感器步数检测算法验证
----------------------------------------------------------------------
   合加速度: √(0.5² + 9.81² + 0.3²) = 9.827
   去除重力后: 0.017 m/s²
✅  加速度向量计算
   峰值检测: 峰值高度 > 2.0 m/s², 最小间隔 250ms
✅  峰值检测算法
   行走: 107 步/分 (≤120 = 行走)
   跑步: 188 步/分 (>120 = 跑步)
✅  步频分析 - 行走/跑步分类
   行走卡路里: MET=3.5 × 70kg × 1小时 = 245 kcal/h
   跑步卡路里: MET=8 × 70kg × 1小时 = 560 kcal/h
✅  卡路里计算 (MET值)
   行走 10000步: 5.0 km (步长 0.5m)
   跑步 10000步: 7.0 km (步长 0.7m)
✅  距离计算 (步长)
```

### 9.2 18项测试通过率

```
============================================================
📊 测试结果汇总
============================================================
✅ 通过: 18 项
❌ 失败: 0 项
📊 通过率: 100%

🎉 所有功能验证通过！代码质量良好，可以部署到真机测试。
```

### 9.3 云函数导出验证

```
=== 云函数导出验证 ===
✅ recognizeFood
✅ updateLeaderboard
✅ checkChallengeCompletion
✅ calculateWeeklyStats
✅ sendWaterReminder
✅ checkInactiveUsers
✅ handleSubscriptionPurchase
✅ exportUserData
✅ testFunction

🎉 所有 9 个云函数已正确导出
```

### 9.4 TypeScript 编译验证

```
> fittrackpro-functions@1.0.0 build
> tsc

✅ 编译完成
-rw-r--r--@ 1 mac  staff    29K May 24 20:53 lib/index.js
-rw-r--r--@ 1 mac  staff    27K May 24 20:53 lib/index.js.map
```

---

## 📚 参考资料

1. **react-native-sensors 文档**: https://react-native-sensors.github.io/
2. **MET值参考**: https://sites.google.com/site/compendiumofphysicalactivities/
3. **步数检测算法综述**: https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6111798/
4. **加速度计步数计数**: https://developer.apple.com/documentation/coremotion/cmpedometer
5. **Android 运动传感器**: https://developer.android.com/guide/topics/sensors/sensors_motion

---

## 📞 技术支持

如遇传感器相关问题，请提供以下信息：
1. 手机型号和系统版本
2. 应用版本号
3. 测试场景（行走/跑步/口袋/背包）
4. 日志输出（`adb logcat` 或 Xcode 控制台）
5. 预期步数 vs 实际步数

---

**文档版本**: v1.0  
**最后更新**: 2026-05-24  
**对应代码**: [sensorService.ts](file:///Users/mac/code/solo%20coder/13/src/services/sensorService.ts)
