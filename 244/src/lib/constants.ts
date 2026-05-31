export interface ObjectCategory {
  label: string;
  cocoLabel: string;
  icon: string;
  color: string;
}

export interface DetectionResult {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export const OBJECT_CATEGORIES: ObjectCategory[] = [
  { label: "手机", cocoLabel: "cell phone", icon: "📱", color: "#00ffd5" },
  { label: "杯子", cocoLabel: "cup", icon: "☕", color: "#ff8c42" },
  { label: "书", cocoLabel: "book", icon: "📖", color: "#a855f7" },
  { label: "瓶子", cocoLabel: "bottle", icon: "🍾", color: "#3b82f6" },
  { label: "椅子", cocoLabel: "chair", icon: "🪑", color: "#f59e0b" },
  { label: "键盘", cocoLabel: "keyboard", icon: "⌨️", color: "#10b981" },
  { label: "鼠标", cocoLabel: "mouse", icon: "🖱️", color: "#ec4899" },
  { label: "显示器", cocoLabel: "tv", icon: "🖥️", color: "#6366f1" },
  { label: "遥控器", cocoLabel: "remote", icon: "🎮", color: "#ef4444" },
  { label: "剪刀", cocoLabel: "scissors", icon: "✂️", color: "#14b8a6" },
];

export const COCO_LABEL_MAP: Record<string, ObjectCategory> = {};
OBJECT_CATEGORIES.forEach((cat) => {
  COCO_LABEL_MAP[cat.cocoLabel] = cat;
});

export type Difficulty = "easy" | "normal" | "hard";

export interface DifficultyConfig {
  detectionInterval: number;
  confidenceThreshold: number;
  targetSwitchDelay: number;
  gameDuration: number;
  scoreMultiplier: number;
  label: string;
  description: string;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: {
    detectionInterval: 1000,
    confidenceThreshold: 0.3,
    targetSwitchDelay: 1500,
    gameDuration: 60,
    scoreMultiplier: 1,
    label: "简单",
    description: "低置信度阈值，慢速检测",
  },
  normal: {
    detectionInterval: 500,
    confidenceThreshold: 0.5,
    targetSwitchDelay: 800,
    gameDuration: 60,
    scoreMultiplier: 2,
    label: "普通",
    description: "中等置信度，标准速度",
  },
  hard: {
    detectionInterval: 200,
    confidenceThreshold: 0.65,
    targetSwitchDelay: 300,
    gameDuration: 60,
    scoreMultiplier: 3,
    label: "困难",
    description: "高置信度，极速检测",
  },
};

export const STORAGE_KEY = "ai-tracker-records";
