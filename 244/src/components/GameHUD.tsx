import { useGameStore } from "@/lib/gameStore";
import { DIFFICULTY_CONFIG, COCO_LABEL_MAP } from "@/lib/constants";
import { useGameTimer } from "@/hooks/useGameTimer";

export default function GameHUD() {
  const score = useGameStore((s) => s.score);
  const combo = useGameStore((s) => s.combo);
  const maxCombo = useGameStore((s) => s.maxCombo);
  const difficulty = useGameStore((s) => s.difficulty);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const players = useGameStore((s) => s.players);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);
  const matchHistory = useGameStore((s) => s.matchHistory);

  useGameTimer();

  const timeRemaining = useGameStore((s) => s.timeRemaining);
  const config = DIFFICULTY_CONFIG[difficulty];
  const matchedCount = matchHistory.filter((h) => h.matched).length;
  const circumference = 2 * Math.PI * 28;
  const progress = (timeRemaining / config.gameDuration) * circumference;

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      <div className="absolute top-4 left-4 cyber-panel p-4 min-w-[160px]">
        <div className="text-xs text-gray-500 font-rajdhani uppercase tracking-wider mb-1">
          得分
        </div>
        <div className="font-orbitron text-3xl text-cyber-cyan neon-text">
          {score}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-gray-500">连击</span>
          <span className="font-orbitron text-lg text-cyber-orange">
            {combo}x
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">最高</span>
          <span className="font-orbitron text-sm text-gray-400">
            {maxCombo}x
          </span>
        </div>
        <div className="mt-1 text-xs text-gray-600">
          {config.label} · x{config.scoreMultiplier}
        </div>
      </div>

      <div className="absolute top-4 right-4 cyber-panel p-4 flex flex-col items-center">
        <div className="text-xs text-gray-500 font-rajdhani uppercase tracking-wider mb-2">
          时间
        </div>
        <div className="relative w-16 h-16">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="#1a2238"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke={timeRemaining <= 10 ? "#ff4757" : "#00ffd5"}
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${progress} ${circumference}`}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div
            className={`absolute inset-0 flex items-center justify-center font-orbitron text-sm ${
              timeRemaining <= 10
                ? "text-cyber-red neon-text-red animate-warning-flash"
                : "text-cyber-cyan"
            }`}
          >
            {timeRemaining}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 cyber-panel p-3">
        <div className="text-xs text-gray-500 mb-1">命中</div>
        <div className="font-orbitron text-lg text-cyber-cyan">
          {matchedCount}
          <span className="text-gray-600 text-sm ml-1">
            / {matchHistory.length}
          </span>
        </div>
      </div>

      {isMultiplayer && players.length > 0 && (
        <div className="absolute bottom-4 right-4 cyber-panel p-3">
          <div className="text-xs text-gray-500 mb-1">当前玩家</div>
          <div className="font-rajdhani text-lg text-cyber-orange">
            {players[currentPlayerIndex]?.name || "—"}
          </div>
          <div className="text-xs text-gray-600">
            {currentPlayerIndex + 1} / {players.length}
          </div>
        </div>
      )}
    </div>
  );
}
