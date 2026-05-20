interface StatusBarProps {
  annotationCount: number
  imageName: string
  zoom: number
}

function StatusBar({ annotationCount, imageName, zoom }: StatusBarProps) {
  return (
    <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center gap-6 text-sm">
      <div className="flex items-center gap-2">
        <span className="text-gray-500">图片:</span>
        <span className="text-gray-300">{imageName || '未选择'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">标注数量:</span>
        <span className="text-blue-400 font-semibold">{annotationCount}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-500">缩放:</span>
        <span className="text-gray-300">{Math.round(zoom * 100)}%</span>
      </div>
      <div className="ml-auto text-gray-500">
        快捷键: Ctrl+S 保存 | Delete 删除 | Tab 切换标签 | 双击编辑
      </div>
    </div>
  )
}

export default StatusBar
