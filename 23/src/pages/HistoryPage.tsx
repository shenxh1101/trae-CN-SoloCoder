import { useEffect, useState } from 'react';
import { History, RefreshCw, Clock, Image as ImageIcon, Eye } from 'lucide-react';
import { ImageCard } from '../components/ImageCard';
import { useAppStore } from '../store/useAppStore';
import { useClassification } from '../hooks/useClassification';
import { formatDate, getShortClassName } from '../utils/api';
import type { ImageClassification } from '../../shared/types';

export function HistoryPage() {
  const { history, setHistory, setClassifications, setBatchReport } = useAppStore();
  const { loadHistory, reclassifyItem } = useClassification();
  const [selectedItem, setSelectedItem] = useState<ImageClassification | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setIsLoading(true);
      await loadHistory(20);
      setIsLoading(false);
    };
    fetchHistory();
  }, [loadHistory]);

  const handleReclassify = async (id: string) => {
    const response = await reclassifyItem(id);
    if (response.success && response.data) {
      setClassifications([response.data]);
      setBatchReport(null);
    }
  };

  const handleViewInClassifier = (item: ImageClassification) => {
    setClassifications([item]);
    setBatchReport(null);
    setSelectedItem(null);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await loadHistory(20);
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">分类历史</span>
          </h1>
          <p className="text-dark-400">最近 20 次分类记录，点击查看详情或重新分类</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          刷新
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="card h-64 animate-pulse"
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      ) : history.length === 0 ? (
        <div className="card p-12 text-center animate-fade-in">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
            <History className="w-10 h-10 text-dark-600" />
          </div>
          <h3 className="text-xl font-semibold text-dark-200 mb-2">
            暂无历史记录
          </h3>
          <p className="text-dark-400 max-w-md mx-auto">
            开始分类图片后，记录将自动保存在这里。您可以随时查看或重新分类。
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {history.map((item, index) => (
              <div
                key={item.id}
                className="card card-hover overflow-hidden cursor-pointer group animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => setSelectedItem(item)}
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={item.thumbnail}
                    alt={item.filename}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform">
                    <div className="flex items-center gap-1 text-xs text-dark-300 mb-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.timestamp)}
                    </div>
                    {item.results[0] && (
                      <div className="text-sm font-medium text-white truncate">
                        {getShortClassName(item.results[0].className)}
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-full bg-dark-800/80 backdrop-blur flex items-center justify-center">
                      <Eye className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  {item.results[0] && (
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 rounded-full text-xs font-mono font-semibold bg-dark-900/80 backdrop-blur text-primary-300">
                        {(item.results[0].confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                  )}
                  {item.feedback && (
                    <div className="absolute bottom-2 right-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.feedback.isCorrect
                          ? 'bg-green-500/80 text-white'
                          : 'bg-red-500/80 text-white'
                      }`}>
                        {item.feedback.isCorrect ? '✓' : '✗'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark-950/90 backdrop-blur-sm animate-fade-in p-4">
          <div className="card w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-dark-700 bg-dark-800/95 backdrop-blur">
              <h3 className="text-lg font-semibold text-dark-100">
                分类详情
              </h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 rounded-full hover:bg-dark-700 flex items-center justify-center transition-colors"
              >
                <span className="text-dark-400 text-xl">×</span>
              </button>
            </div>
            <div className="p-4">
              <ImageCard
                classification={selectedItem}
                showHistory={false}
                onReclassify={() => handleReclassify(selectedItem.id)}
              />
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="btn-secondary"
                >
                  关闭
                </button>
                <button
                  onClick={() => handleViewInClassifier(selectedItem)}
                  className="btn-primary flex items-center gap-2"
                >
                  <ImageIcon className="w-4 h-4" />
                  在分类页查看
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
