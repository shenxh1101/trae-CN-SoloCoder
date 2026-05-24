import { useState, useCallback, useRef } from 'react';
import { Upload, Link, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useImageProcessing } from '../hooks/useImageProcessing';
import { useClassification } from '../hooks/useClassification';
import { generateId } from '../utils/api';

export function ImageUploader() {
  const {
    pendingImages,
    activeTab,
    setActiveTab,
    addPendingImage,
    removePendingImage,
    clearPendingImages,
  } = useAppStore();

  const { compressImage } = useImageProcessing();
  const { performClassification, performUrlClassification, isClassifying } = useClassification();

  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter((file) =>
        file.type.startsWith('image/')
      );

      const remainingSlots = 10 - pendingImages.length;
      const filesToProcess = validFiles.slice(0, remainingSlots);

      for (const file of filesToProcess) {
        try {
          const compressed = await compressImage(file);
          addPendingImage({
            file,
            preview: compressed,
            filename: file.name,
          });
        } catch (error) {
          console.error('Failed to process image:', error);
        }
      }
    },
    [pendingImages.length, addPendingImage, compressImage]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const handleUrlSubmit = async () => {
    setUrlError('');
    if (!urlInput.trim()) {
      setUrlError('请输入图片URL');
      return;
    }

    try {
      const response = await performUrlClassification(urlInput);
      if (!response.success) {
        setUrlError(response.error || 'URL加载失败');
      } else {
        setUrlInput('');
      }
    } catch (error) {
      setUrlError('URL加载失败，请检查链接是否有效');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2 bg-dark-800/50 p-1 rounded-full w-fit">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'upload'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          <Upload className="w-4 h-4 inline mr-2" />
          本地上传
        </button>
        <button
          onClick={() => setActiveTab('url')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            activeTab === 'url'
              ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
              : 'text-dark-400 hover:text-dark-200'
          }`}
        >
          <Link className="w-4 h-4 inline mr-2" />
          URL加载
        </button>
      </div>

      {activeTab === 'upload' && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
              transition-all duration-300 overflow-hidden
              ${
                isDragging
                  ? 'border-primary-400 bg-primary-500/10 scale-[1.02]'
                  : 'border-dark-600 hover:border-primary-500/50 hover:bg-dark-800/30'
              }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="absolute inset-0 bg-grid-pattern bg-[size:40px_40px] opacity-[0.15]" />
            <div className="relative z-10">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/20 flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-primary-400" />
              </div>
              <p className="text-lg font-medium text-dark-100 mb-2">
                拖拽图片到此处或点击选择
              </p>
              <p className="text-sm text-dark-400">
                支持 JPG、PNG、GIF 等格式，最多上传 10 张
              </p>
              <p className="text-xs text-dark-500 mt-2">
                已选择 {pendingImages.length}/10 张
              </p>
            </div>
          </div>

          {pendingImages.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-dark-100">待分类图片</h3>
                <button
                  onClick={clearPendingImages}
                  className="text-sm text-dark-400 hover:text-red-400 transition-colors"
                >
                  清空全部
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {pendingImages.map((img, index) => (
                  <div
                    key={img.id}
                    className="relative group rounded-xl overflow-hidden bg-dark-800 border border-dark-700 animate-scale-in"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <img
                      src={img.processedPreview}
                      alt={img.filename}
                      className="w-full h-28 object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removePendingImage(img.id);
                      }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-xs text-white truncate">{img.filename}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={performClassification}
                disabled={isClassifying || pendingImages.length === 0}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isClassifying ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    AI 正在识别中...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-5 h-5" />
                    开始分类 ({pendingImages.length} 张)
                  </>
                )}
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'url' && (
        <div className="space-y-4">
          <div className="card p-6">
            <label className="block text-sm font-medium text-dark-200 mb-2">
              图片URL
            </label>
            <div className="flex gap-3">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                placeholder="https://example.com/image.jpg"
                className="input flex-1"
              />
              <button
                onClick={handleUrlSubmit}
                disabled={isClassifying || !urlInput.trim()}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isClassifying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Link className="w-5 h-5" />
                )}
                分类
              </button>
            </div>
            {urlError && (
              <p className="text-sm text-red-400 mt-2">{urlError}</p>
            )}
            <p className="text-xs text-dark-500 mt-3">
              提示：请确保目标URL允许跨域访问，否则可能加载失败
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
