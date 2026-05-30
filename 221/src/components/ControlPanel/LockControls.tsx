import { Lock, Unlock } from 'lucide-react';
import { useCreatureStore } from '../../store/useCreatureStore';
import { BODY_PART_LABELS, BodyPartType } from '../../types/creature';

const ALL_LOCKABLE_PARTS: BodyPartType[] = [
  'head',
  'torso',
  'arm_left',
  'arm_right',
  'leg_left',
  'leg_right',
  'tail',
];

export function LockControls() {
  const { lockedParts, toggleLock, currentCreature } = useCreatureStore();

  const existingParts = new Set(currentCreature?.parts.map((p) => p.type) || []);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white/90 flex items-center gap-2">
        <Lock className="w-5 h-5 text-amber-400" />
        部位锁定
      </h3>

      <div className="text-xs text-white/40 mb-2">
        点击生物部位或下方开关可锁定，锁定后进化时保持不变
      </div>

      <div className="space-y-2">
        {ALL_LOCKABLE_PARTS.map((partType) => {
          const isLocked = lockedParts.has(partType);
          const exists = existingParts.has(partType);

          return (
            <button
              key={partType}
              onClick={() => toggleLock(partType)}
              disabled={!exists}
              className={`w-full flex items-center justify-between p-3 rounded-lg
                transition-all duration-200
                ${
                  !exists
                    ? 'bg-white/5 opacity-40 cursor-not-allowed'
                    : isLocked
                    ? 'bg-amber-500/20 border border-amber-500/50'
                    : 'bg-white/5 border border-white/10 hover:bg-white/10'
                }`}
            >
              <div className="flex items-center gap-2">
                {isLocked ? (
                  <Lock className="w-4 h-4 text-amber-400" />
                ) : (
                  <Unlock className="w-4 h-4 text-white/50" />
                )}
                <span
                  className={`text-sm ${
                    isLocked ? 'text-amber-300 font-medium' : 'text-white/80'
                  }`}
                >
                  {BODY_PART_LABELS[partType]}
                </span>
              </div>

              <div
                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-200
                ${isLocked ? 'bg-amber-500' : 'bg-white/20'}`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-md
                    transform transition-transform duration-200
                    ${isLocked ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
