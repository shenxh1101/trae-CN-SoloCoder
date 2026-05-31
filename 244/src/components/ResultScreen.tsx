import { useGameStore } from "@/lib/gameStore";
import { COCO_LABEL_MAP, DIFFICULTY_CONFIG } from "@/lib/constants";
import { calculateAccuracy, getFastestTime, getStatsByObject, getTopRecords } from "@/lib/storage";
import { Trophy, Clock, BarChart3, Home, RotateCcw, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ResultScreenProps {
  onNextPlayer: () => void;
}

export default function ResultScreen({ onNextPlayer }: ResultScreenProps) {
  const score = useGameStore((s) => s.score);
  const matchHistory = useGameStore((s) => s.matchHistory);
  const difficulty = useGameStore((s) => s.difficulty);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const players = useGameStore((s) => s.players);
  const resetGame = useGameStore((s) => s.resetGame);
  const currentPlayerIndex = useGameStore((s) => s.currentPlayerIndex);

  const [showDetail, setShowDetail] = useState(false);
  const [showRanking, setShowRanking] = useState(false);

  const accuracy = calculateAccuracy(matchHistory);
  const fastestTime = getFastestTime(matchHistory);
  const matchedCount = matchHistory.filter((h) => h.matched).length;
  const statsByObject = getStatsByObject(matchHistory);
  const config = DIFFICULTY_CONFIG[difficulty];
  const allRecords = getTopRecords(5);

  const hasMorePlayers = isMultiplayer && currentPlayerIndex < players.length - 1;

  const handleNextPlayer = () => {
    onNextPlayer();
  };

  const handlePlayAgain = () => {
    resetGame();
  };

  const formatTime = (ms: number) => {
    if (ms === 0) return "—";
    return (ms / 1000).toFixed(2) + "s";
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6 overflow-auto">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-cyber-cyan/10 border border-cyber-cyan/30 mb-4">
            <Trophy size={40} className="text-cyber-cyan" />
          </div>
          <h1 className="font-orbitron text-4xl text-cyber-cyan neon-text mb-2">
            游戏结束
          </h1>
          <p className="font-rajdhani text-gray-500">{config.label}模式</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 animate-slide-up">
          <div className="cyber-panel p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">得分</div>
            <div className="font-orbitron text-2xl text-cyber-cyan">{score}</div>
          </div>
          <div className="cyber-panel p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">准确率</div>
            <div className="font-orbitron text-2xl text-cyber-orange">
              {Math.round(accuracy * 100)}%
            </div>
          </div>
          <div className="cyber-panel p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">最快识别</div>
            <div className="font-orbitron text-2xl text-cyber-purple">
              {formatTime(fastestTime)}
            </div>
          </div>
          <div className="cyber-panel p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">命中</div>
            <div className="font-orbitron text-2xl text-blue-400">
              {matchedCount}/{matchHistory.length}
            </div>
          </div>
        </div>

        <div className="cyber-panel p-4 mb-4">
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-cyber-cyan" />
              <span className="font-rajdhani font-semibold">
                物体类别统计
              </span>
            </div>
            {showDetail ? (
              <ChevronUp size={18} className="text-gray-500" />
            ) : (
              <ChevronDown size={18} className="text-gray-500" />
            )}
          </button>

          {showDetail && (
            <div className="mt-4 space-y-2">
              {Object.entries(statsByObject).map(([key, stat]) => {
                const cat = COCO_LABEL_MAP[key];
                const rate =
                  stat.total > 0 ? Math.round((stat.matched / stat.total) * 100) : 0;
                return (
                  <div
                    key={key}
                    className="flex items-center gap-3 bg-cyber-bg/50 rounded-lg p-3"
                  >
                    <span className="text-xl">{cat?.icon || "❓"}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-rajdhani font-semibold">
                          {cat?.label || key}
                        </span>
                        <span className="text-sm text-gray-500">
                          {stat.matched}/{stat.total}
                        </span>
                      </div>
                      <div className="w-full bg-cyber-border rounded-full h-1.5 mt-1">
                        <div
                          className="h-1.5 rounded-full transition-all"
                          style={{
                            width: `${rate}%`,
                            backgroundColor: cat?.color || "#00ffd5",
                          }}
                        />
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-gray-600">
                        <span>准确率 {rate}%</span>
                        <span>
                          <Clock size={10} className="inline" /> 最快{" "}
                          {formatTime(stat.fastestTime)}
                        </span>
                        <span>均速 {formatTime(stat.avgTime)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {Object.keys(statsByObject).length === 0 && (
                <div className="text-center text-gray-600 py-4">
                  暂无数据
                </div>
              )}
            </div>
          )}
        </div>

        {isMultiplayer && players.length > 0 && (
          <div className="cyber-panel p-4 mb-4">
            <button
              onClick={() => setShowRanking(!showRanking)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Users size={18} className="text-cyber-orange" />
                <span className="font-rajdhani font-semibold">玩家排行</span>
              </div>
              {showRanking ? (
                <ChevronUp size={18} className="text-gray-500" />
              ) : (
                <ChevronDown size={18} className="text-gray-500" />
              )}
            </button>

            {showRanking && (
              <div className="mt-4 space-y-2">
                {[...players]
                  .sort((a, b) => b.score - a.score)
                  .map((p, i) => (
                    <div
                      key={p.id}
                      className={`flex items-center gap-3 rounded-lg p-3 ${
                        i === 0
                          ? "bg-yellow-500/10 border border-yellow-500/20"
                          : i === 1
                          ? "bg-gray-400/10 border border-gray-400/20"
                          : i === 2
                          ? "bg-amber-700/10 border border-amber-700/20"
                          : "bg-cyber-bg/50"
                      }`}
                    >
                      <span
                        className={`font-orbitron text-lg w-8 text-center ${
                          i === 0
                            ? "text-yellow-400"
                            : i === 1
                            ? "text-gray-400"
                            : i === 2
                            ? "text-amber-600"
                            : "text-gray-600"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="font-rajdhani font-semibold">
                          {p.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          准确率 {Math.round(p.accuracy * 100)}% · 最快{" "}
                          {formatTime(p.fastestTime)}
                        </div>
                      </div>
                      <div className="font-orbitron text-xl text-cyber-cyan">
                        {p.score}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        <div className="cyber-panel p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-yellow-400" />
            <span className="font-rajdhani font-semibold">历史最佳</span>
          </div>
          <div className="space-y-1">
            {allRecords.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center justify-between text-sm py-1"
              >
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 w-4">{i + 1}</span>
                  <span className="text-gray-400">{r.playerName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-600">{r.difficulty}</span>
                  <span className="font-orbitron text-cyber-cyan">
                    {r.score}
                  </span>
                </div>
              </div>
            ))}
            {allRecords.length === 0 && (
              <div className="text-gray-600 text-center py-2">
                暂无记录
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {hasMorePlayers ? (
            <button
              onClick={handleNextPlayer}
              className="cyber-btn-primary flex items-center justify-center gap-2 text-lg"
            >
              <Users size={20} />
              下一位玩家: {players[currentPlayerIndex + 1]?.name}
            </button>
          ) : (
            <button
              onClick={handlePlayAgain}
              className="cyber-btn-primary flex items-center justify-center gap-2 text-lg"
            >
              <RotateCcw size={20} />
              再来一局
            </button>
          )}
          <button
            onClick={handlePlayAgain}
            className="cyber-btn-ghost flex items-center justify-center gap-2"
          >
            <Home size={18} />
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
}
