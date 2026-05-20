import type { Annotation } from '../types'

interface AnnotationListProps {
  annotations: Annotation[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onDelete: (id: string) => void
  onEditLabel: (annotation: Annotation) => void
}

function AnnotationList({
  annotations,
  selectedId,
  onSelect,
  onDelete,
  onEditLabel
}: AnnotationListProps) {
  return (
    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col h-full">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">标注列表</h2>
        <span className="px-3 py-1 bg-blue-600 text-white text-sm rounded-full">
          {annotations.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {annotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg mb-2">暂无标注</p>
            <p className="text-sm">上传图片后点击"绘制矩形"开始标注</p>
          </div>
        ) : (
          <div className="space-y-2">
            {annotations.map((annotation, index) => (
              <div
                key={annotation.id}
                onClick={() => onSelect(annotation.id)}
                className={`annotation-item p-3 rounded-lg cursor-pointer border-2 transition-all ${
                  selectedId === annotation.id
                    ? 'bg-amber-900/30 border-amber-500'
                    : 'bg-gray-700/50 border-transparent hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 bg-gray-600 px-2 py-0.5 rounded">
                      #{index + 1}
                    </span>
                    <span className="text-blue-400 font-medium">
                      {annotation.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEditLabel(annotation)
                      }}
                      className="w-7 h-7 rounded bg-gray-600 hover:bg-gray-500 flex items-center justify-center text-sm transition-colors"
                      title="编辑标签"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(annotation.id)
                      }}
                      className="w-7 h-7 rounded bg-red-600/80 hover:bg-red-500 flex items-center justify-center text-sm transition-colors"
                      title="删除标注"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-gray-400">
                  <span>x: {Math.round(annotation.x)}</span>
                  <span>y: {Math.round(annotation.y)}</span>
                  <span>w: {Math.round(annotation.width)}</span>
                  <span>h: {Math.round(annotation.height)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default AnnotationList
