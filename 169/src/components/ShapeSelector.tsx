import { useFractalStore } from '@/store/fractalStore'
import type { ShapeType } from '@/types'

const shapes: { value: ShapeType; label: string; icon: string }[] = [
  { value: 'tetrahedron', label: '四面体', icon: '△' },
  { value: 'cube', label: '立方体', icon: '□' },
  { value: 'icosahedron', label: '二十面体', icon: '⬡' },
]

export default function ShapeSelector() {
  const shapeType = useFractalStore((s) => s.shapeType)
  const setShapeType = useFractalStore((s) => s.setShapeType)

  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-200 font-display mb-2">
        基本形状
      </label>
      <div className="grid grid-cols-3 gap-2">
        {shapes.map((shape) => (
          <button
            key={shape.value}
            onClick={() => setShapeType(shape.value)}
            className={`py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex flex-col items-center gap-1
              ${shapeType === shape.value
                ? 'bg-cyber-pink text-white shadow-lg shadow-cyber-pink/30'
                : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
              }`}
          >
            <span className="text-lg">{shape.icon}</span>
            <span>{shape.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
