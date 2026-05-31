import { useEffect, useState, useRef } from "react";
import { useGameStore } from "@/lib/gameStore";
import { COCO_LABEL_MAP, DIFFICULTY_CONFIG } from "@/lib/constants";

export default function TargetDisplay() {
  const currentTarget = useGameStore((s) => s.currentTarget);
  const combo = useGameStore((s) => s.combo);
  const lastMatchTime = useGameStore((s) => s.lastMatchTime);
  const difficulty = useGameStore((s) => s.difficulty);

  const [animKey, setAnimKey] = useState(0);
  const [floatScores, setFloatScores] = useState<Array<{ id: number; score: number; x: number; y: number }>>([]);

  const prevComboRef = useRef(0);
  const floatIdRef = useRef(0);

  useEffect(() => {
    if (currentTarget) {
      setAnimKey((k) => k + 1);
    }
  }, [currentTarget]);

  useEffect(() => {
    if (combo > 0 && combo !== prevComboRef.current && prevComboRef.current !== 0) {
      const multiplier = DIFFICULTY_CONFIG[difficulty].scoreMultiplier;
      const addedScore = (10 + 10 * (combo - 1)) * multiplier;
      floatIdRef.current += 1;
      const newFloat = {
        id: floatIdRef.current,
        score: addedScore,
        x: Math.random() * 100 - 50,
        y: -20 - Math.random() * 20,
      };
      setFloatScores((prev) => [...prev, newFloat]);

      setTimeout(() => {
        setFloatScores((prev) => prev.filter((f) => f.id !== newFloat.id));
      }, 1000);
    }
    prevComboRef.current = combo;
  }, [combo, difficulty]);

  if (!currentTarget) return null;

  const cat = COCO_LABEL_MAP[currentTarget];

  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none flex flex-col items-center">
      <div
        key={animKey}
        className="animate-target-appear flex flex-col items-center"
      >
        <div className="text-6xl mb-2 drop-shadow-lg">{cat?.icon || "🎯"}</div>
        <div className="font-orbitron text-5xl md:text-7xl font-bold text-cyber-cyan neon-text tracking-wider whitespace-nowrap">
          {cat?.label || currentTarget}
        </div>
        <div className="mt-2 text-sm text-gray-500 font-rajdhani tracking-widest uppercase">
          寻找这个物体
        </div>
      </div>

      {combo >= 2 && (
        <div className="mt-4 animate-bounce-in">
          <div className="font-orbitron text-2xl text-cyber-orange neon-text tracking-wider">
            {combo}x COMBO!
          </div>
        </div>
      )}

      {floatScores.map((f) => (
        <div
          key={f.id}
          className="absolute float-score font-orbitron text-xl text-cyber-cyan neon-text"
          style={{
            transform: `translate(${f.x}px, ${f.y}px)`,
          }}
        >
          +{f.score}
        </div>
      ))}

      {lastMatchTime > 0 && (
        <div className="absolute -bottom-10 text-sm text-cyber-purple font-rajdhani animate-fade-in">
          识别时间: {(lastMatchTime / 1000).toFixed(2)}s
        </div>
      )}
    </div>
  );
}
