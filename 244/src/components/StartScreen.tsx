import { useState } from "react";
import { useGameStore } from "@/lib/gameStore";
import {
  Difficulty,
  DIFFICULTY_CONFIG,
  OBJECT_CATEGORIES,
} from "@/lib/constants";
import { Settings, Users, Play, ChevronRight, Volume2, VolumeX, Eye, EyeOff } from "lucide-react";

interface StartScreenProps {
  onStartGame: () => void;
  loading: boolean;
}

export default function StartScreen({ onStartGame, loading }: StartScreenProps) {
  const difficulty = useGameStore((s) => s.difficulty);
  const setDifficulty = useGameStore((s) => s.setDifficulty);
  const selectedObjects = useGameStore((s) => s.selectedObjects);
  const toggleObject = useGameStore((s) => s.toggleObject);
  const voiceEnabled = useGameStore((s) => s.voiceEnabled);
  const setVoiceEnabled = useGameStore((s) => s.setVoiceEnabled);
  const showBoundingBoxes = useGameStore((s) => s.showBoundingBoxes);
  const setShowBoundingBoxes = useGameStore((s) => s.setShowBoundingBoxes);
  const isMultiplayer = useGameStore((s) => s.isMultiplayer);
  const setMultiplayer = useGameStore((s) => s.setMultiplayer);
  const players = useGameStore((s) => s.players);
  const addPlayer = useGameStore((s) => s.addPlayer);
  const removePlayer = useGameStore((s) => s.removePlayer);

  const [playerName, setPlayerName] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);

  const handleAddPlayer = () => {
    if (playerName.trim()) {
      addPlayer(playerName.trim());
      setPlayerName("");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-auto">
      <div className="absolute inset-0 scanline-overlay" />

      <div className="relative z-10 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="font-orbitron text-5xl md:text-7xl font-black text-cyber-cyan neon-text mb-2 tracking-wider">
            AI TRACKER
          </h1>
          <p className="font-rajdhani text-xl text-gray-500 tracking-widest">
            物体追踪挑战
          </p>
        </div>

        {!showSettings && !showPlayerSetup && (
          <div className="animate-fade-in flex flex-col items-center gap-4">
            <div className="cyber-panel p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 font-rajdhani text-sm">
                  难度
                </span>
                <span className="font-orbitron text-cyber-cyan">
                  {DIFFICULTY_CONFIG[difficulty].label}
                </span>
              </div>
              <div className="flex gap-2">
                {(["easy", "normal", "hard"] as Difficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDifficulty(d)}
                    className={`flex-1 py-2 rounded font-rajdhani font-semibold transition-all ${
                      difficulty === d
                        ? "bg-cyber-cyan/20 border border-cyber-cyan text-cyber-cyan"
                        : "bg-cyber-panel border border-cyber-border text-gray-500 hover:border-cyber-cyan/30"
                    }`}
                  >
                    {DIFFICULTY_CONFIG[d].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setMultiplayer(!isMultiplayer)}
                className={`cyber-btn flex items-center gap-2 ${
                  isMultiplayer
                    ? "bg-cyber-orange/10 border-cyber-orange text-cyber-orange"
                    : ""
                }`}
                style={!isMultiplayer ? { background: "transparent", borderColor: "#1a2238", color: "#6b7280" } : undefined}
              >
                <Users size={18} />
                {isMultiplayer ? "多人模式" : "单人模式"}
              </button>
            </div>

            <div className="flex gap-3 flex-wrap justify-center">
              <button
                onClick={() => setShowSettings(true)}
                className="cyber-btn-ghost flex items-center gap-2"
              >
                <Settings size={18} />
                设置
              </button>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className="cyber-btn-ghost flex items-center gap-2"
              >
                {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                {voiceEnabled ? "语音开" : "语音关"}
              </button>
              <button
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className="cyber-btn-ghost flex items-center gap-2"
              >
                {showBoundingBoxes ? <Eye size={18} /> : <EyeOff size={18} />}
                {showBoundingBoxes ? "框选开" : "框选关"}
              </button>
            </div>

            {isMultiplayer && (
              <button
                onClick={() => setShowPlayerSetup(true)}
                className="cyber-btn-ghost flex items-center gap-2"
              >
                <Users size={18} />
                管理玩家 ({players.length})
              </button>
            )}

            <button
              onClick={onStartGame}
              disabled={loading || (isMultiplayer && players.length === 0)}
              className="cyber-btn-primary flex items-center gap-3 text-lg mt-4 min-w-[200px] justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-cyber-cyan border-t-transparent rounded-full animate-spin" />
                  加载中...
                </div>
              ) : isMultiplayer && players.length === 0 ? (
                "请先添加玩家"
              ) : (
                <>
                  <Play size={22} />
                  开始游戏
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        )}

        {showSettings && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-orbitron text-xl text-cyber-cyan">
                物体选择
              </h2>
              <button
                onClick={() => setShowSettings(false)}
                className="cyber-btn-ghost text-sm"
              >
                返回
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-4 font-rajdhani">
              选择游戏中需要追踪的物体类别（至少1个）
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {OBJECT_CATEGORIES.map((cat) => {
                const selected = selectedObjects.includes(cat.cocoLabel);
                return (
                  <button
                    key={cat.cocoLabel}
                    onClick={() => toggleObject(cat.cocoLabel)}
                    className={`p-4 rounded-lg border transition-all text-left ${
                      selected
                        ? "bg-cyber-cyan/10 border-cyber-cyan/50 shadow-[0_0_10px_rgba(0,255,213,0.1)]"
                        : "bg-cyber-panel border-cyber-border opacity-50 hover:opacity-70"
                    }`}
                  >
                    <div className="text-2xl mb-1">{cat.icon}</div>
                    <div
                      className={`font-rajdhani font-semibold ${
                        selected ? "text-cyber-cyan" : "text-gray-500"
                      }`}
                    >
                      {cat.label}
                    </div>
                    <div className="text-xs text-gray-600">{cat.cocoLabel}</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {showPlayerSetup && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-orbitron text-xl text-cyber-orange">
                玩家管理
              </h2>
              <button
                onClick={() => setShowPlayerSetup(false)}
                className="cyber-btn-ghost text-sm"
              >
                返回
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                placeholder="输入玩家名称..."
                className="flex-1 bg-cyber-panel border border-cyber-border rounded-lg px-4 py-2 text-white font-rajdhani placeholder-gray-600 focus:border-cyber-orange/50 focus:outline-none"
              />
              <button
                onClick={handleAddPlayer}
                className="cyber-btn-primary text-sm"
              >
                添加
              </button>
            </div>
            <div className="space-y-2">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="cyber-panel p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-orbitron text-cyber-orange w-6 text-center">
                      {i + 1}
                    </span>
                    <span className="font-rajdhani text-lg">{p.name}</span>
                  </div>
                  <button
                    onClick={() => removePlayer(p.id)}
                    className="text-gray-600 hover:text-cyber-red transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {players.length === 0 && (
                <div className="text-center text-gray-600 font-rajdhani py-8">
                  添加至少1名玩家
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
