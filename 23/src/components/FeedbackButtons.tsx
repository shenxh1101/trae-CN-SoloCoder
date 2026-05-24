import { useState } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';
import { useClassification } from '../hooks/useClassification';
import type { ClassificationResult } from '../../shared/types';

interface FeedbackButtonsProps {
  imageId: string;
  results: ClassificationResult[];
  feedbackGiven?: boolean;
}

export function FeedbackButtons({ imageId, results, feedbackGiven }: FeedbackButtonsProps) {
  const { submitFeedback } = useClassification();
  const [showCorrectInput, setShowCorrectInput] = useState(false);
  const [selectedCorrect, setSelectedCorrect] = useState<string>('');
  const [submitted, setSubmitted] = useState(feedbackGiven || false);
  const [submittedCorrect, setSubmittedCorrect] = useState<boolean | null>(null);

  const topResult = results[0];

  const handleCorrect = async () => {
    if (!topResult) return;
    await submitFeedback({
      imageId,
      predictedClass: topResult.className,
      isCorrect: true,
      correctClass: null,
    });
    setSubmitted(true);
    setSubmittedCorrect(true);
  };

  const handleIncorrect = () => {
    setShowCorrectInput(true);
  };

  const handleSubmitIncorrect = async () => {
    if (!topResult || !selectedCorrect) return;
    await submitFeedback({
      imageId,
      predictedClass: topResult.className,
      isCorrect: false,
      correctClass: selectedCorrect,
    });
    setSubmitted(true);
    setSubmittedCorrect(false);
    setShowCorrectInput(false);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 mt-3">
        {submittedCorrect ? (
          <span className="tag bg-green-500/20 text-green-300 border-green-500/30">
            <Check className="w-3 h-3 mr-1" />
            标注正确
          </span>
        ) : (
          <span className="tag bg-red-500/20 text-red-300 border-red-500/30">
            <X className="w-3 h-3 mr-1" />
            标注错误
          </span>
        )}
      </div>
    );
  }

  if (showCorrectInput) {
    return (
      <div className="mt-3 space-y-2">
        <div className="flex gap-2">
          <select
            value={selectedCorrect}
            onChange={(e) => setSelectedCorrect(e.target.value)}
            className="input text-sm flex-1"
          >
            <option value="">选择正确类别...</option>
            {results.map((r) => (
              <option key={r.classId} value={r.className}>
                {r.className}
              </option>
            ))}
            <option value="other">其他（不在列表中）</option>
          </select>
          <button
            onClick={handleSubmitIncorrect}
            disabled={!selectedCorrect}
            className="btn-primary py-2 px-4 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            提交
          </button>
          <button
            onClick={() => setShowCorrectInput(false)}
            className="btn-secondary py-2 px-4 text-sm"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 mt-3">
      <span className="text-xs text-dark-400 mr-2">分类是否正确？</span>
      <button
        onClick={handleCorrect}
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-all"
      >
        <Check className="w-4 h-4" />
        正确
      </button>
      <button
        onClick={handleIncorrect}
        className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-full bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-all"
      >
        <X className="w-4 h-4" />
        错误
        <ChevronDown className="w-3 h-3" />
      </button>
    </div>
  );
}
