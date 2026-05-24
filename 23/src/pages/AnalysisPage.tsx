import { useEffect, useState } from 'react';
import { BarChart3, RefreshCw, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { ConfusionMatrix } from '../components/ConfusionMatrix';
import { ThresholdSlider } from '../components/ThresholdSlider';
import { useClassification } from '../hooks/useClassification';
import type { ConfusionMatrixData, FeedbackSubmission } from '../../shared/types';

export function AnalysisPage() {
  const { getConfusionMatrix, getFeedback } = useClassification();
  const [matrixData, setMatrixData] = useState<ConfusionMatrixData | null>(null);
  const [feedbackData, setFeedbackData] = useState<FeedbackSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [matrixRes, feedbackRes] = await Promise.all([
      getConfusionMatrix(),
      getFeedback(),
    ]);
    if (matrixRes.success && matrixRes.data) {
      setMatrixData(matrixRes.data);
    }
    if (feedbackRes.success && feedbackRes.data) {
      setFeedbackData(feedbackRes.data);
    }
    setIsLoading(false);
  };

  const correctCount = feedbackData.filter(f => f.isCorrect).length;
  const incorrectCount = feedbackData.filter(f => !f.isCorrect).length;
  const accuracy = feedbackData.length > 0
    ? (correctCount / feedbackData.length) * 100
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">模型分析</span>
          </h1>
          <p className="text-dark-400">查看模型性能指标和混淆矩阵分析</p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 animate-slide-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-400 text-sm">标注总数</span>
            <BarChart3 className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-dark-100">
            {feedbackData.length}
          </div>
          <div className="text-xs text-dark-500 mt-1">条用户反馈</div>
        </div>

        <div className="card p-6 animate-slide-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-400 text-sm">正确标注</span>
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-green-400">
            {correctCount}
          </div>
          <div className="text-xs text-dark-500 mt-1">
            {feedbackData.length > 0 ? `${((correctCount / feedbackData.length) * 100).toFixed(1)}%` : '0%'}
          </div>
        </div>

        <div className="card p-6 animate-slide-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-400 text-sm">错误标注</span>
            <XCircle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-red-400">
            {incorrectCount}
          </div>
          <div className="text-xs text-dark-500 mt-1">
            {feedbackData.length > 0 ? `${((incorrectCount / feedbackData.length) * 100).toFixed(1)}%` : '0%'}
          </div>
        </div>

        <div className="card p-6 animate-slide-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-400 text-sm">人工准确率</span>
            <TrendingUp className="w-5 h-5 text-accent-400" />
          </div>
          <div className="text-3xl font-bold font-mono gradient-text">
            {accuracy.toFixed(1)}%
          </div>
          <div className="text-xs text-dark-500 mt-1">基于用户标注反馈</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <ConfusionMatrix data={matrixData} isLoading={isLoading} />
        </div>

        <div className="space-y-6">
          <ThresholdSlider />

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">使用说明</h3>
            <div className="space-y-4 text-sm text-dark-400">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 text-primary-400 font-semibold text-xs">
                  1
                </div>
                <p>
                  在分类页面对每张图片的分类结果进行标注（正确/错误）
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 text-primary-400 font-semibold text-xs">
                  2
                </div>
                <p>
                  当标注数据累积到一定数量后，系统将自动生成混淆矩阵
                </p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0 text-primary-400 font-semibold text-xs">
                  3
                </div>
                <p>
                  调节置信度阈值可以过滤低置信度的预测结果
                </p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">最近标注记录</h3>
            {feedbackData.length === 0 ? (
              <p className="text-sm text-dark-500">暂无标注数据</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {feedbackData.slice(-10).reverse().map((fb, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-2 rounded-lg text-xs ${
                      fb.isCorrect
                        ? 'bg-green-500/10 border border-green-500/20'
                        : 'bg-red-500/10 border border-red-500/20'
                    }`}
                  >
                    {fb.isCorrect ? (
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-dark-200 truncate">
                        {fb.predictedClass.split(',')[0]}
                      </div>
                      {!fb.isCorrect && fb.correctClass && fb.correctClass !== 'other' && (
                        <div className="text-dark-500 truncate">
                          → {fb.correctClass.split(',')[0]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
