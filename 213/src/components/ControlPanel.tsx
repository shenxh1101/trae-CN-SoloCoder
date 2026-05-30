import { useState } from 'react'
import { Dice1, ChevronDown } from 'lucide-react'
import { useStore } from '@/store/useStore'
import ImageUploader from '@/components/ImageUploader'
import CurveEditor from '@/components/CurveEditor'
import ColorLegend from '@/components/ColorLegend'

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-white/5 pb-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-xs uppercase tracking-wider text-white/40 mb-3 font-['Orbitron'] hover:text-white/60 transition-colors"
      >
        {title}
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  )
}

export default function ControlPanel() {
  const seed = useStore((s) => s.seed)
  const segments = useStore((s) => s.segments)
  const amplitude = useStore((s) => s.amplitude)
  const setSeed = useStore((s) => s.setSeed)
  const setSegments = useStore((s) => s.setSegments)
  const setAmplitude = useStore((s) => s.setAmplitude)
  const randomizeSeed = useStore((s) => s.randomizeSeed)

  const [openSections, setOpenSections] = useState({
    terrain: true,
    image: true,
    curve: true,
    legend: true,
  })

  const toggle = (key: keyof typeof openSections) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-[#0a0e17]/80 backdrop-blur-xl border-l border-white/10 z-40 overflow-y-auto">
      <div className="p-5 space-y-5">
        <h1 className="text-sm uppercase tracking-widest text-white/50 font-['Orbitron']">
          地形编辑器
        </h1>

        <Section title="地形参数" open={openSections.terrain} onToggle={() => toggle('terrain')}>
          <div className="flex items-center gap-2">
            <label className="text-xs text-white/50 w-10 shrink-0 font-['Noto_Sans_SC']">
              种子
            </label>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value))}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/80 outline-none focus:border-purple-500/50 font-['Noto_Sans_SC']"
            />
            <button
              onClick={randomizeSeed}
              className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-purple-500/20 hover:border-purple-500/50 transition-all"
            >
              <Dice1 size={14} className="text-white/60" />
            </button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/50 font-['Noto_Sans_SC']">精细度</label>
              <span className="text-xs text-white/40 font-mono">{segments}</span>
            </div>
            <input
              type="range"
              min={16}
              max={512}
              step={16}
              value={segments}
              onChange={(e) => setSegments(Number(e.target.value))}
              className="w-full h-1 rounded-full appearance-none bg-white/10 accent-purple-500 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30 [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/30 [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-white/50 font-['Noto_Sans_SC']">起伏强度</label>
              <span className="text-xs text-white/40 font-mono">{amplitude.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.1}
              value={amplitude}
              onChange={(e) => setAmplitude(Number(e.target.value))}
              className="w-full h-1 rounded-full appearance-none bg-white/10 accent-purple-500 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30 [&::-webkit-slider-thumb]:cursor-pointer
                [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-purple-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/30 [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>
        </Section>

        <Section title="参考图片" open={openSections.image} onToggle={() => toggle('image')}>
          <ImageUploader />
        </Section>

        <Section title="颜色映射曲线" open={openSections.curve} onToggle={() => toggle('curve')}>
          <CurveEditor />
        </Section>

        <Section title="颜色图例" open={openSections.legend} onToggle={() => toggle('legend')}>
          <ColorLegend />
        </Section>
      </div>
    </div>
  )
}
