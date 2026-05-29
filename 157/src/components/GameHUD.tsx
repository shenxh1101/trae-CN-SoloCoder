import { GameState } from '../types/game';

interface GameHUDProps {
  gameState: GameState;
}

export function GameHUD({ gameState }: GameHUDProps) {
  const healthPercent = gameState.health;
  const isHealthLow = healthPercent < 30;

  return (
    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start z-20">
      <div className="text-left">
        <div className="text-3xl font-bold text-white">
          {gameState.score.toLocaleString()}
        </div>
        <div className="text-sm text-gray-400">得分</div>
      </div>

      <div className="text-center">
        {gameState.combo > 0 && (
          <div className="animate-pulse">
            <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-pink-400 bg-clip-text text-transparent">
              {gameState.combo}
            </div>
            <div className="text-sm text-cyan-400">COMBO</div>
          </div>
        )}
      </div>

      <div className="text-right">
        <div className="w-48 h-4 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-200 rounded-full ${
              isHealthLow
                ? 'bg-gradient-to-r from-red-500 to-red-400 animate-pulse'
                : 'bg-gradient-to-r from-green-500 to-cyan-400'
            }`}
            style={{ width: `${healthPercent}%` }}
          />
        </div>
        <div className="text-sm text-gray-400 mt-1">
          HP: {Math.round(healthPercent)}%
        </div>
      </div>
    </div>
  );
}
