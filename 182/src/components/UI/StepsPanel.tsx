import { useAppStore } from '../../store/appStore';
import { Move, FACE_LABELS } from '../../types';

export default function StepsPanel() {
  const { moveHistory } = useAppStore();

  const formatMove = (move: Move): string => {
    const typeLabels = {
      tip: '顶点',
      middle: '中层',
      face: '整面',
    };
    const dirLabels = {
      clockwise: '顺',
      counterclockwise: '逆',
    };
    return `${FACE_LABELS[move.face]}-${typeLabels[move.type]}-${dirLabels[move.direction]}`;
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10">
      <div className="glass-panel rounded-xl p-4 w-56 max-h-[60vh] flex flex-col">
        <h3 className="text-neon-cyan font-bold text-center mb-3 text-sm">
          步骤记录 ({moveHistory.length})
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {moveHistory.length === 0 ? (
            <div className="text-white/40 text-center text-xs py-8">
              暂无操作记录
              <br />
              点击打乱开始
            </div>
          ) : (
            moveHistory.map((move, index) => (
              <div
                key={index}
                className="flex items-center justify-between text-xs p-2 rounded bg-white/5 hover:bg-white/10 transition-colors"
              >
                <span className="text-neon-cyan font-mono w-6">
                  #{index + 1}
                </span>
                <span className="text-white/80 font-mono flex-1 text-center">
                  {formatMove(move)}
                </span>
                <span className="text-white/40 text-[10px]">
                  {move.timestamp !== undefined ? formatTime(move.timestamp) : ''}
                </span>
              </div>
            ))
          )}
        </div>

        {moveHistory.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-xs text-white/50 text-center">
              共 {moveHistory.length} 步
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
