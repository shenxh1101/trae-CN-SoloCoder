import { useState } from 'react';
import { Edit, RefreshCw, Clock, AlertTriangle } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { FeedbackButtons } from './FeedbackButtons';
import { useAppStore } from '../store/useAppStore';
import { formatDate, formatConfidence, getShortClassName } from '../utils/api';
import type { ImageClassification } from '../../shared/types';

interface ImageCardProps {
  classification: ImageClassification;
  index?: number;
  showHistory?: boolean;
  onReclassify?: () => void;
}

export function ImageCard({ classification, index = 0, showHistory = false, onReclassify }: ImageCardProps) {
  const { threshold, setEditorImage, pendingImages } = useAppStore();
  const [showAllResults, setShowAllResults] = useState(false);

  const topResult = classification.results[0];
  const filteredResults = classification.results.filter(
    (r) => r.confidence >= threshold
  );
  const hasValidResults = filteredResults.length > 0;
  const isBelowThreshold = topResult && topResult.confidence < threshold;

  const handleEnhance = () => {
    const pendingImg = pendingImages.find(p => p.id === classification.id);
    if (pendingImg) {
      setEditorImage(pendingImg);
    }
  };

  return (
    <div
      className="card card-hover overflow-hidden animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative">
        <img
          src={classification.thumbnail}
          alt={classification.filename}
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-dark-900/20 to-transparent" />
        
        <div className="absolute top-3 right-3 flex gap-2">
          {classification.feedback && (
            <span className={`tag text-xs ${
              classification.feedback.isCorrect
                ? 'bg-green-500/30 text-green-300 border-green-500/40'
                : 'bg-red-500/30 text-red-300 border-red-500/40'
            }`}>
              {classification.feedback.isCorrect ? '✓ 正确' : '✗ 错误'}
            </span>
          )}
        </div>

        {!showHistory && (
          <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEnhance}
              className="w-8 h-8 rounded-full bg-dark-800/80 backdrop-blur flex items-center justify-center text-dark-200 hover:bg-primary-500 hover:text-white transition-all"
              title="图片增强"
            >
              <Edit className="w-4 h-4" />
            </button>
            {onReclassify && (
              <button
                onClick={onReclassify}
                className="w-8 h-8 rounded-full bg-dark-800/80 backdrop-blur flex items-center justify-center text-dark-200 hover:bg-accent-500 hover:text-white transition-all"
                title="重新分类"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {isBelowThreshold && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs">
            <AlertTriangle className="w-3.5 h-3.5" />
            无法识别
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-dark-100 truncate" title={classification.filename}>
              {classification.filename}
            </h4>
            <div className="flex items-center gap-1 text-xs text-dark-500 mt-1">
              <Clock className="w-3 h-3" />
              {formatDate(classification.timestamp)}
            </div>
          </div>
          {topResult && hasValidResults && (
            <div className="text-right ml-3">
              <div className="text-2xl font-bold font-mono gradient-text">
                {formatConfidence(topResult.confidence)}
              </div>
              <div className="text-xs text-dark-500">置信度</div>
            </div>
          )}
        </div>

        {topResult && hasValidResults && (
          <div className="mb-3">
            <div className="text-sm text-dark-300 mb-1">预测类别</div>
            <div className="text-lg font-semibold text-primary-300">
              {getShortClassName(topResult.className)}
            </div>
          </div>
        )}

        {!hasValidResults && (
          <div className="mb-3 p-3 rounded-lg bg-dark-900/50 border border-dark-700">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>所有结果置信度均低于阈值 ({(threshold * 100).toFixed(0)}%)</span>
            </div>
          </div>
        )}

        <div className="space-y-2 mb-2">
          {(showAllResults ? filteredResults : filteredResults.slice(0, 3)).map(
            (result, idx) => (
              <ProgressBar
                key={`${classification.id}-${result.classId}`}
                confidence={result.confidence}
                label={getShortClassName(result.className)}
                delay={idx * 150 + 200}
                rank={idx}
              />
            )
          )}
        </div>

        {filteredResults.length > 3 && (
          <button
            onClick={() => setShowAllResults(!showAllResults)}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors mt-2"
          >
            {showAllResults ? '收起' : `显示全部 ${filteredResults.length} 个结果`}
          </button>
        )}

        {!showHistory && hasValidResults && (
          <FeedbackButtons
            imageId={classification.id}
            results={classification.results}
            feedbackGiven={!!classification.feedback}
          />
        )}
      </div>
    </div>
  );
}
