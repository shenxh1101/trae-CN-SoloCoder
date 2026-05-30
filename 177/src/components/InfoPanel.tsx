import { Globe, Moon as MoonLucide } from 'lucide-react'
import { EARTH_DATA, MOON_DATA } from '@/utils/constants'
import { useSolarSystemStore } from '@/store/useSolarSystemStore'

function DataRow({ label, earthVal, moonVal }: { label: string; earthVal: string; moonVal: string }) {
  return (
    <tr className="border-b border-white/5">
      <td className="py-1.5 text-[10px] text-moon-gray font-noto">{label}</td>
      <td className="py-1.5 text-[10px] text-earth-blue font-orbitron text-right">{earthVal}</td>
      <td className="py-1.5 text-[10px] text-white/70 font-orbitron text-right">{moonVal}</td>
    </tr>
  )
}

export default function InfoPanel() {
  const earthMoonDistance = useSolarSystemStore((s) => s.earthMoonDistance)
  const realDistance = ((earthMoonDistance / 8.0) * 384400).toFixed(0)

  return (
    <div className="fixed left-4 bottom-4 z-10 glass-panel p-4 w-80">
      <h3 className="font-orbitron text-xs text-star-blue tracking-widest mb-3 uppercase">
        天体数据
      </h3>

      <div className="flex gap-4 mb-3">
        <div className="flex items-center gap-2">
          <Globe size={16} className="text-earth-blue" />
          <span className="text-xs font-noto text-white/80">地球</span>
        </div>
        <div className="flex items-center gap-2">
          <MoonLucide size={14} className="text-moon-gray" />
          <span className="text-xs font-noto text-white/80">月球</span>
        </div>
      </div>

      <table className="w-full">
        <thead>
          <tr className="border-b border-star-blue/20">
            <th className="text-left text-[9px] text-moon-gray/60 pb-1 font-noto">参数</th>
            <th className="text-right text-[9px] text-earth-blue/60 pb-1 font-orbitron">地球</th>
            <th className="text-right text-[9px] text-white/40 pb-1 font-orbitron">月球</th>
          </tr>
        </thead>
        <tbody>
          <DataRow label="直径" earthVal={EARTH_DATA.diameter} moonVal={MOON_DATA.diameter} />
          <DataRow label="质量" earthVal={EARTH_DATA.mass} moonVal={MOON_DATA.mass} />
          <DataRow label="距日距离" earthVal={EARTH_DATA.distFromSun} moonVal={MOON_DATA.distFromSun} />
          <DataRow label="表面重力" earthVal={EARTH_DATA.surfaceGravity} moonVal={MOON_DATA.surfaceGravity} />
          <DataRow label="自转周期" earthVal={EARTH_DATA.rotationPeriod} moonVal={MOON_DATA.rotationPeriod} />
          <DataRow label="公转周期" earthVal={EARTH_DATA.orbitalPeriod} moonVal={MOON_DATA.orbitalPeriod} />
        </tbody>
      </table>

      <div className="mt-3 pt-3 border-t border-star-blue/20">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-moon-gray font-noto">地月实时距离</span>
          <span className="text-sm font-orbitron text-orbit-gold distance-pulse">
            {Number(realDistance).toLocaleString()} km
          </span>
        </div>
      </div>
    </div>
  )
}
