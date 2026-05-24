import { useState } from 'react';
import { BarChart3, TrendingUp, Image as ImageIcon } from 'lucide-react';
import { ImageUploader } from '../components/ImageUploader';
import { ImageCard } from '../components/ImageCard';
import { TagCloud } from '../components/TagCloud';
import { ThresholdSlider } from '../components/ThresholdSlider';
import { ImageEditor } from '../components/ImageEditor';
import { useAppStore } from '../store/useAppStore';
import { useClassification } from '../hooks/useClassification';
import { formatConfidence } from '../utils/api';

export function ClassifyPage() {
  const { classifications, batchReport, editorImage, setEditorImage, isClassifying } = useAppStore();
  const { loadHistory } = useClassification();
  const [showBatchReport, setShowBatchReport] = useState(false);

  const handleReclassify = async (id: string) => {
    await loadHistory();
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-4xl font-bold mb-4">
          <span className="gradient-text">AI 图像分类演示</span>
        </h1>
        <p className="text-dark-400 text-lg max-w-2xl mx-auto">
          基于 MobileNet 预训练模型，支持 1000+ 类别的实时图像识别
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <ImageUploader />

          {classifications.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-dark-100 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary-400" />
                  分类结果
                  <span className="text-sm text-dark-400 font-normal">
                    ({classifications.length} 张图片)
                  </span>
                </h2>
                {classifications.length > 1 && (
                  <button
                    onClick={() => setShowBatchReport(!showBatchReport)}
                    className="btn-secondary py-2 px-4 text-sm flex items-center gap-2"
                  >
                    <BarChart3 className="w-4 h-4" />
                    {showBatchReport ? '隐藏报告' : '查看批量报告'}
                  </button>
                )}
              </div>

              {showBatchReport && batchReport && (
                <div className="card p-6 animate-scale-in">
                  <h3 className="text-lg font-semibold text-dark-100 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent-400" />
                    批量分类报告
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/50">
                      <div className="text-3xl font-bold font-mono gradient-text">
                        {batchReport.totalImages}
                      </div>
                      <div className="text-sm text-dark-400">图片总数</div>
                    </div>
                    <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/50">
                      <div className="text-3xl font-bold font-mono text-accent-300">
                        {Object.keys(batchReport.classFrequency).length}
                      </div>
                      <div className="text-sm text-dark-400">识别类别</div>
                    </div>
                    <div className="bg-dark-900/50 rounded-xl p-4 border border-dark-700/50">
                      <div className="text-3xl font-bold font-mono text-primary-300">
                        {formatConfidence(batchReport.averageConfidence)}
                      </div>
                      <div className="text-sm text-dark-400">平均置信度</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-dark-300 mb-3">类别分布标签云</h4>
                    <div className="bg-dark-900/30 rounded-xl p-4 border border-dark-700/50">
                      <TagCloud frequency={batchReport.classFrequency} />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {classifications.map((cls, idx) => (
                  <ImageCard
                    key={cls.id}
                    classification={cls}
                    index={idx}
                    onReclassify={() => handleReclassify(cls.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {classifications.length === 0 && !isClassifying && (
            <div className="card p-12 text-center animate-fade-in">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                <ImageIcon className="w-10 h-10 text-primary-400" />
              </div>
              <h3 className="text-xl font-semibold text-dark-200 mb-2">
                开始图像分类
              </h3>
              <p className="text-dark-400 max-w-md mx-auto">
                上传或拖拽图片到上方区域，AI 将自动识别图片内容并返回 Top-5 分类结果
              </p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <ThresholdSlider />

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-dark-100 mb-4">关于 MobileNet</h3>
            <p className="text-sm text-dark-400 leading-relaxed mb-4">
              MobileNet 是 Google 开发的轻量级深度学习模型，专为移动和嵌入式设备设计。
              它使用深度可分离卷积技术，在保持较高准确率的同时大幅减少计算量。
            </p>
            <div className="space-y-2 text-xs text-dark-500">
              <div className="flex justify-between">
                <span>模型版本</span>
                <span className="text-dark-300">MobileNetV2</span>
              </div>
              <div className="flex justify-between">
                <span>训练数据集</span>
                <span className="text-dark-300">ImageNet</span>
              </div>
              <div className="flex justify-between">
                <span>类别数量</span>
                <span className="text-dark-300">1000 类</span>
              </div>
              <div className="flex justify-between">
                <span>输入尺寸</span>
                <span className="text-dark-300">224 × 224</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {editorImage && (
        <ImageEditor
          image={editorImage}
          onClose={() => setEditorImage(null)}
        />
      )}
    </div>
  );
}
