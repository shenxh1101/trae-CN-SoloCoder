import type { FractalStats } from '@/types'

interface StatsDisplayProps {
  stats: FractalStats
}

export default function StatsDisplay({ stats }: StatsDisplayProps) {
  return (
    <div className="mt-auto pt-4 border-t border-gray-700/50">
      <div className="text-xs text-gray-500 mb-2 font-display">统计信息</div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-800/50 rounded-lg py-2 px-1">
          <div className="text-cyber-cyan font-bold font-mono text-sm">
            {stats.vertices.toLocaleString()}
          </div>
          <div className="text-gray-500 text-[10px]">顶点</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg py-2 px-1">
          <div className="text-cyber-pink font-bold font-mono text-sm">
            {stats.faces.toLocaleString()}
          </div>
          <div className="text-gray-500 text-[10px]">面</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg py-2 px-1">
          <div className="text-cyber-amber font-bold font-mono text-sm">
            {stats.instances.toLocaleString()}
          </div>
          <div className="text-gray-500 text-[10px]">实例</div>
        </div>
      </div>
    </div>
  )
}
