import { JudgeResult } from '../types/game';

interface JudgeFeedbackProps {
  result: JudgeResult | null;
}

const resultConfig = {
  perfect: {
    text: 'PERFECT',
    color: 'text-cyan-400',
    shadow: 'shadow-cyan-500/50',
  },
  good: {
    text: 'GOOD',
    color: 'text-green-400',
    shadow: 'shadow-green-500/50',
  },
  miss: {
    text: 'MISS',
    color: 'text-red-400',
    shadow: 'shadow-red-500/50',
  },
};

export function JudgeFeedback({ result }: JudgeFeedbackProps) {
  if (!result) return null;

  const config = resultConfig[result];

  return (
    <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30">
      <div
        key={Date.now()}
        className={`text-4xl font-bold ${config.color} animate-bounce drop-shadow-lg`}
        style={{
          animation: 'feedbackPop 0.5s ease-out forwards',
        }}
      >
        {config.text}
      </div>
      <style>{`
        @keyframes feedbackPop {
          0% {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
          100% {
            opacity: 0;
            transform: scale(1.5) translateY(-30px);
          }
        }
      `}</style>
    </div>
  );
}
