import { useParticleStore } from '@/store/useParticleStore'
import { exportConfigAsJson, importConfigFromJson } from '@/utils/exportUtils'
import {
  Camera,
  Download,
  Upload,
  CameraOff,
  Sparkles,
  Type,
  Palette,
  Move,
  Box,
  Circle,
  Square,
  Star,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  FileJson,
  Zap,
  Wind,
} from 'lucide-react'
import { ParticleShape, MotionMode, FontType } from '@/types'

function SectionTitle({ children, icon: Icon }: { children: React.ReactNode; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-violet-300/80">
      <Icon size={14} className="text-violet-400" />
      {children}
    </div>
  )
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-zinc-400 mb-1">
        <span>{label}</span>
        <span className="text-violet-300 font-mono">{value.toFixed(step < 1 ? 1 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-zinc-700/50 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-400
          [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(139,92,246,0.6)]
          [&::-webkit-slider-thumb]:hover:bg-violet-300
          [&::-webkit-slider-thumb]:transition-colors"
      />
    </div>
  )
}

function ToggleButton({
  active,
  onClick,
  children,
  icon: Icon,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: React.ElementType
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
        ${active
          ? 'bg-violet-500/20 text-violet-300 border border-violet-500/30 shadow-[0_0_12px_rgba(139,92,246,0.15)]'
          : 'bg-zinc-800/40 text-zinc-500 border border-zinc-700/30 hover:text-zinc-300 hover:border-zinc-600/50'
        }`}
    >
      {Icon && <Icon size={12} />}
      {children}
    </button>
  )
}

function ActionButton({
  onClick,
  children,
  icon: Icon,
  variant = 'default',
}: {
  onClick: () => void
  children: React.ReactNode
  icon?: React.ElementType
  variant?: 'default' | 'accent' | 'danger'
}) {
  const variantClasses = {
    default: 'bg-zinc-800/50 border-zinc-700/40 text-zinc-300 hover:bg-zinc-700/50 hover:border-zinc-600/50',
    accent: 'bg-violet-500/15 border-violet-500/30 text-violet-300 hover:bg-violet-500/25 shadow-[0_0_12px_rgba(139,92,246,0.1)]',
    danger: 'bg-rose-500/10 border-rose-500/20 text-rose-300 hover:bg-rose-500/20',
  }

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all duration-200 ${variantClasses[variant]}`}
    >
      {Icon && <Icon size={13} />}
      {children}
    </button>
  )
}

export default function ControlPanel() {
  const store = useParticleStore()

  return (
    <div className="w-72 h-full overflow-y-auto custom-scrollbar bg-zinc-950/80 backdrop-blur-xl border-r border-zinc-800/50">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
            <Sparkles size={16} className="text-violet-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-100 tracking-wide">粒子文字特效</h1>
            <p className="text-[10px] text-zinc-500">3D Particle Text</p>
          </div>
        </div>

        <div className="mb-5">
          <SectionTitle icon={Type}>文字输入</SectionTitle>
          <input
            type="text"
            maxLength={20}
            value={store.text}
            onChange={(e) => store.setConfig({ text: e.target.value })}
            placeholder="输入文字..."
            className="w-full px-3 py-2.5 bg-zinc-900/60 border border-zinc-700/40 rounded-lg text-sm text-zinc-100
              placeholder:text-zinc-600 focus:outline-none focus:border-violet-500/50 focus:shadow-[0_0_12px_rgba(139,92,246,0.15)]
              transition-all font-mono"
          />
          <div className="flex justify-end mt-1">
            <span className="text-[10px] text-zinc-600">{store.text.length}/20</span>
          </div>
        </div>

        <div className="mb-5">
          <SectionTitle icon={Palette}>粒子参数</SectionTitle>
          <SliderControl
            label="粒子大小"
            value={store.particleSize}
            min={0.5}
            max={8}
            step={0.5}
            onChange={(v) => store.setConfig({ particleSize: v })}
          />
          <SliderControl
            label="文字厚度"
            value={store.thickness}
            min={1}
            max={10}
            step={1}
            onChange={(v) => store.setConfig({ thickness: v })}
          />
          <SliderControl
            label="透明度"
            value={store.opacity}
            min={0}
            max={1}
            step={0.1}
            onChange={(v) => store.setConfig({ opacity: v })}
          />
        </div>

        <div className="mb-5">
          <SectionTitle icon={Palette}>颜色渐变</SectionTitle>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500 block mb-1">起始色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={store.colorStart}
                  onChange={(e) => store.setConfig({ colorStart: e.target.value })}
                  className="w-8 h-8 rounded border border-zinc-700/50 cursor-pointer bg-transparent"
                />
                <span className="text-[10px] text-zinc-500 font-mono">{store.colorStart}</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-zinc-500 block mb-1">结束色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={store.colorEnd}
                  onChange={(e) => store.setConfig({ colorEnd: e.target.value })}
                  className="w-8 h-8 rounded border border-zinc-700/50 cursor-pointer bg-transparent"
                />
                <span className="text-[10px] text-zinc-500 font-mono">{store.colorEnd}</span>
              </div>
            </div>
          </div>
          <div
            className="mt-2 h-2 rounded-full"
            style={{
              background: `linear-gradient(to right, ${store.colorStart}, ${store.colorEnd})`,
            }}
          />
        </div>

        <div className="mb-5">
          <SectionTitle icon={Move}>运动模式</SectionTitle>
          <div className="flex gap-2 flex-wrap">
            <ToggleButton
              active={store.motionMode === 'static'}
              onClick={() => store.setConfig({ motionMode: 'static' as MotionMode })}
              icon={RotateCcw}
            >
              静止
            </ToggleButton>
            <ToggleButton
              active={store.motionMode === 'float'}
              onClick={() => store.setConfig({ motionMode: 'float' as MotionMode })}
              icon={Wind}
            >
              飘浮
            </ToggleButton>
            <ToggleButton
              active={store.motionMode === 'rotate'}
              onClick={() => store.setConfig({ motionMode: 'rotate' as MotionMode })}
              icon={Zap}
            >
              旋转
            </ToggleButton>
          </div>
        </div>

        <div className="mb-5">
          <SectionTitle icon={Type}>字体切换</SectionTitle>
          <div className="flex gap-2">
            <ToggleButton
              active={store.font === 'default'}
              onClick={() => store.setConfig({ font: 'default' as FontType })}
            >
              默认体
            </ToggleButton>
            <ToggleButton
              active={store.font === 'artistic'}
              onClick={() => store.setConfig({ font: 'artistic' as FontType })}
            >
              艺术体
            </ToggleButton>
          </div>
        </div>

        <div className="mb-5">
          <SectionTitle icon={Circle}>粒子形状</SectionTitle>
          <div className="flex gap-2">
            <ToggleButton
              active={store.particleShape === 'circle'}
              onClick={() => store.setConfig({ particleShape: 'circle' as ParticleShape })}
              icon={Circle}
            >
              圆形
            </ToggleButton>
            <ToggleButton
              active={store.particleShape === 'square'}
              onClick={() => store.setConfig({ particleShape: 'square' as ParticleShape })}
              icon={Square}
            >
              方形
            </ToggleButton>
            <ToggleButton
              active={store.particleShape === 'star'}
              onClick={() => store.setConfig({ particleShape: 'star' as ParticleShape })}
              icon={Star}
            >
              星形
            </ToggleButton>
          </div>
        </div>

        <div className="mb-5">
          <SectionTitle icon={Sparkles}>特效</SectionTitle>
          <div className="space-y-2">
            <ToggleButton
              active={store.showNebula}
              onClick={() => store.setConfig({ showNebula: !store.showNebula })}
              icon={store.showNebula ? Eye : EyeOff}
            >
              背景星云
            </ToggleButton>
            <div className="flex gap-2 mt-2">
              <ToggleButton
                active={store.autoRotateCamera}
                onClick={() => store.setConfig({ autoRotateCamera: !store.autoRotateCamera })}
                icon={Camera}
              >
                相机旋转
              </ToggleButton>
            </div>
          </div>
        </div>

        <div className="mb-5">
          <SectionTitle icon={Play}>淡入淡出</SectionTitle>
          <div className="flex gap-2">
            <ActionButton
              onClick={() => store.setConfig({ fadeDirection: 'in' })}
              icon={Eye}
              variant="accent"
            >
              淡入
            </ActionButton>
            <ActionButton
              onClick={() => store.setConfig({ fadeDirection: 'out' })}
              icon={EyeOff}
              variant="danger"
            >
              淡出
            </ActionButton>
          </div>
        </div>

        <div className="mb-5">
          <SectionTitle icon={Download}>导出操作</SectionTitle>
          <div className="space-y-2">
            <ActionButton
              onClick={() => window.dispatchEvent(new Event('take-screenshot'))}
              icon={Camera}
              variant="accent"
            >
              截图保存 PNG
            </ActionButton>
            <div className="flex gap-2">
              <ActionButton onClick={exportConfigAsJson} icon={FileJson}>
                导出 JSON
              </ActionButton>
              <ActionButton onClick={importConfigFromJson} icon={Upload}>
                导入 JSON
              </ActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
