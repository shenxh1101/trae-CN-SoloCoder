interface ToolbarProps {
  onImageUpload: () => void
  onLoadSample: () => void
  onSave: () => void
  onExport: () => void
  onClearAll: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onResetView: () => void
  zoom: number
  isDrawing: boolean
  setIsDrawing: (value: boolean) => void
  labelSuggestions: string[]
}

function Toolbar({
  onImageUpload,
  onLoadSample,
  onSave,
  onExport,
  onClearAll,
  onZoomIn,
  onZoomOut,
  onResetView,
  zoom,
  isDrawing,
  setIsDrawing,
  labelSuggestions
}: ToolbarProps) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          onClick={onImageUpload}
          className="btn px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <span>📁</span>
          上传图片
        </button>
        <button
          onClick={onLoadSample}
          className="btn px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <span>🖼️</span>
          示例图片
        </button>
      </div>

      <div className="h-8 w-px bg-gray-600" />

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsDrawing(!isDrawing)}
          className={`btn px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
            isDrawing
              ? 'bg-purple-600 hover:bg-purple-500 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-white'
          }`}
        >
          <span>{isDrawing ? '🔲' : '✏️'}</span>
          {isDrawing ? '绘制中' : '绘制矩形'}
        </button>
      </div>

      <div className="h-8 w-px bg-gray-600" />

      <div className="flex items-center gap-2">
        <button
          onClick={onZoomOut}
          className="btn w-9 h-9 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center"
          title="缩小"
        >
          ➖
        </button>
        <span className="text-gray-400 text-sm min-w-[60px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="btn w-9 h-9 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center"
          title="放大"
        >
          ➕
        </button>
        <button
          onClick={onResetView}
          className="btn w-9 h-9 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center justify-center"
          title="重置视图"
        >
          🔄
        </button>
      </div>

      <div className="h-8 w-px bg-gray-600" />

      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          className="btn px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
          title="Ctrl+S"
        >
          <span>💾</span>
          保存
        </button>
        <button
          onClick={onExport}
          className="btn px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <span>📤</span>
          导出COCO
        </button>
        <button
          onClick={onClearAll}
          className="btn px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <span>🗑️</span>
          清除全部
        </button>
      </div>

      {labelSuggestions.length > 0 && (
        <>
          <div className="h-8 w-px bg-gray-600" />
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-sm">常用标签:</span>
            <div className="flex flex-wrap gap-1 max-w-md">
              {labelSuggestions.slice(0, 6).map((label, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Toolbar
