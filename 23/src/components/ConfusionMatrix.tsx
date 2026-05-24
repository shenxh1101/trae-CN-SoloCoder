import { useMemo } from 'react';
import { AlertCircle, Info } from 'lucide-react';
import type { ConfusionMatrixData } from '../../shared/types';

interface ConfusionMatrixProps {
  data: ConfusionMatrixData | null;
  isLoading?: boolean;
}

export function ConfusionMatrix({ data, isLoading }: ConfusionMatrixProps) {
  const colorScale = useMemo(() => {
    return (value: number, max: number) => {
      if (max === 0) return 'rgba(148, 163, 184, 0.1)';
      const intensity = value / max;
      const hue = 200 - intensity * 120;
      const saturation = 70 + intensity * 20;
      const lightness = 15 + intensity * 25;
      return `hsla(${hue}, ${saturation}%, ${lightness}%, ${0.3 + intensity * 0.6})`;
    };
  }, []);

  const maxValue = useMemo(() => {
    if (!data) return 0;
    return Math.max(...data.matrix.flat(), 1);
  }, [data]);

  if (isLoading) {
    return (
      <div className="card p-8 flex items-center justify-center min-h-[300px]">
        <div className="animate-pulse text-dark-400">加载中...</div>
      </div>
    );
  }

  if (!data || data.totalSamples === 0) {
    return (
      <div className="card p-8">
        <div className="flex flex-col items-center justify-center text-center py-8">
          <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-dark-500" />
          </div>
          <h3 className="text-lg font-semibold text-dark-200 mb-2">
            暂无混淆矩阵数据
          </h3>
          <p className="text-sm text-dark-400 max-w-md">
            当您标注了足够的反馈数据后，系统将自动生成混淆矩阵，展示模型在各个类别上的表现。
          </p>
          <div className="mt-4 p-3 rounded-lg bg-dark-800/50 border border-dark-700">
            <div className="flex items-start gap-2 text-xs text-dark-400">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-primary-400" />
              <span>
                混淆矩阵是评估分类模型性能的重要工具。行代表真实类别，列代表预测类别。
                对角线元素表示正确分类的样本数，非对角线元素表示错误分类的样本数。
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayClasses = data.classes.slice(0, 8);
  const displayMatrix = data.matrix.slice(0, 8).map(row => row.slice(0, 8));

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-dark-100">混淆矩阵</h3>
          <p className="text-sm text-dark-400 mt-1">
            基于 {data.totalSamples} 条标注数据，准确率：
            <span className="font-mono font-semibold text-primary-300 ml-1">
              {(data.accuracy * 100).toFixed(1)}%
            </span>
          </p>
        </div>
        {data.classes.length > 8 && (
          <span className="text-xs text-dark-500">
            仅显示前 8 个类别
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs text-dark-400 font-medium">
                真实 ↓ / 预测 →
              </th>
              {displayClasses.map((cls, idx) => (
                <th
                  key={idx}
                  className="p-2 text-center text-xs text-dark-400 font-medium max-w-[100px]"
                  title={cls}
                >
                  <div className="truncate">{cls.split(',')[0]}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayMatrix.map((row, i) => (
              <tr key={i}>
                <td
                  className="p-2 text-xs text-dark-300 font-medium max-w-[100px]"
                  title={displayClasses[i]}
                >
                  <div className="truncate">{displayClasses[i]?.split(',')[0]}</div>
                </td>
                {row.map((value, j) => {
                  const isDiagonal = i === j;
                  return (
                    <td
                      key={j}
                      className="p-2 text-center"
                      style={{
                        backgroundColor: colorScale(value, maxValue),
                      }}
                    >
                      <div
                        className={`text-sm font-mono font-semibold ${
                          isDiagonal ? 'text-green-300' : 'text-dark-200'
                        }`}
                      >
                        {value}
                      </div>
                      {value > 0 && (
                        <div className="text-[10px] text-dark-500">
                          {((value / data.totalSamples) * 100).toFixed(1)}%
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-r from-dark-700/50 to-primary-500/70" />
          <span className="text-xs text-dark-400">低 → 高 预测频率</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-green-500/50 bg-green-500/20" />
          <span className="text-xs text-dark-400">对角线 = 正确分类</span>
        </div>
      </div>
    </div>
  );
}
