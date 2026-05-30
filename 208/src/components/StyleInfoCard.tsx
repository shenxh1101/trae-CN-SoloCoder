import { Info, User, Calendar, Sparkles } from 'lucide-react';
import type { ArtStyle, CubeFace } from '../types';

interface StyleInfoCardProps {
  style: ArtStyle;
  face: CubeFace;
}

const faceLabels: Record<CubeFace, string> = {
  front: '正面',
  back: '背面',
  left: '左面',
  right: '右面',
  top: '顶面',
  bottom: '底面',
};

export function StyleInfoCard({ style, face }: StyleInfoCardProps) {
  return (
    <div className="w-72 bg-slate-900/90 backdrop-blur-xl border-l border-slate-700/50 h-full overflow-y-auto">
      <div className="p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-cyan-400" />
          当前风格信息
        </h2>

        <div className="mb-4">
          <span className="text-xs text-slate-500 uppercase tracking-wider">当前面</span>
          <div className="mt-1 px-3 py-1.5 bg-slate-800 rounded-lg inline-block">
            <span className="text-sm font-medium text-white">{faceLabels[face]}</span>
          </div>
        </div>

        <div
          className="w-full h-40 rounded-xl mb-4 shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${style.baseColor} 0%, ${style.accentColor} 100%)`,
          }}
        >
          <div className="w-full h-full flex items-center justify-center bg-black/20 rounded-xl">
            <Sparkles className="w-12 h-12 text-white/80" />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white">{style.nameCn}</h3>
            <p className="text-sm text-slate-400">{style.name}</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <User className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">艺术家</p>
              <p className="text-sm font-medium text-white">{style.author}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">年代</p>
              <p className="text-sm font-medium text-white">{style.year}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 mb-2">风格介绍</p>
            <p className="text-sm text-slate-300 leading-relaxed">{style.description}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-700/50">
          <p className="text-xs text-slate-500 mb-3">风格配色</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <div
                className="w-full h-10 rounded-lg shadow-inner"
                style={{ backgroundColor: style.baseColor }}
              />
              <p className="text-xs text-slate-500 mt-1 text-center">主色</p>
            </div>
            <div className="flex-1">
              <div
                className="w-full h-10 rounded-lg shadow-inner"
                style={{ backgroundColor: style.accentColor }}
              />
              <p className="text-xs text-slate-500 mt-1 text-center">强调色</p>
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-slate-800/50 rounded-xl">
          <p className="text-xs text-cyan-400 mb-2">💡 提示</p>
          <p className="text-xs text-slate-400">
            点击立方体的任意面可以快速选中该面进行风格切换
          </p>
        </div>
      </div>
    </div>
  );
}
