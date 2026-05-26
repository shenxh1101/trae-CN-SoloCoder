import { Box, Ruler, Info } from 'lucide-react';
import { MoleculeSize, MeasurementResult, MoleculeData, ELEMENT_NAMES } from '../types';
import { formatNumber } from '../utils/helpers';

interface InfoPanelProps {
  molecule: MoleculeData | null;
  moleculeSize: MoleculeSize | null;
  measurementResult: MeasurementResult | null;
  hoveredAtom: string | null;
}

export default function InfoPanel({
  molecule,
  moleculeSize,
  measurementResult,
  hoveredAtom,
}: InfoPanelProps) {
  if (!molecule) return null;

  const getAtomElement = (atomId: string) => {
    const atom = molecule.atoms.find((a) => a.id === atomId);
    return atom ? ELEMENT_NAMES[atom.element] : atomId;
  };

  return (
    <div className="absolute left-4 bottom-4 z-10 w-72 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-white font-bold text-sm flex items-center gap-2">
          <Info className="w-4 h-4" />
          分子信息
        </h2>
      </div>

      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-white/60 text-xs mb-1">分子名称</h3>
          <p className="text-white font-medium">
            {molecule.name} <span className="text-white/50">({molecule.formula})</span>
          </p>
        </div>

        {moleculeSize && (
          <div>
            <h3 className="text-white/60 text-xs mb-2 flex items-center gap-1">
              <Box className="w-3 h-3" />
              分子尺寸 (Å)
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-white/50 text-xs">宽度</p>
                <p className="text-white font-mono text-sm">
                  {formatNumber(moleculeSize.width)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-white/50 text-xs">高度</p>
                <p className="text-white font-mono text-sm">
                  {formatNumber(moleculeSize.height)}
                </p>
              </div>
              <div className="bg-white/5 rounded-lg p-2 text-center">
                <p className="text-white/50 text-xs">深度</p>
                <p className="text-white font-mono text-sm">
                  {formatNumber(moleculeSize.depth)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-white/60 text-xs mb-2">原子组成</h3>
          <div className="flex flex-wrap gap-1">
            {molecule.atoms.map((atom) => (
              <span
                key={atom.id}
                className="px-2 py-0.5 bg-white/10 rounded text-xs text-white"
              >
                {ELEMENT_NAMES[atom.element]}
              </span>
            ))}
          </div>
        </div>

        {hoveredAtom && (
          <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-3">
            <h3 className="text-blue-400 text-xs mb-1">悬停原子</h3>
            <p className="text-white font-medium">{getAtomElement(hoveredAtom)}</p>
          </div>
        )}

        {measurementResult && (
          <div className="bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-3">
            <h3 className="text-yellow-400 text-xs mb-2 flex items-center gap-1">
              <Ruler className="w-3 h-3" />
              键长测量结果
            </h3>
            <div className="flex items-center justify-between">
              <span className="text-white/80 text-sm">
                {getAtomElement(measurementResult.atom1)} - {getAtomElement(measurementResult.atom2)}
              </span>
              <span className="text-yellow-400 font-mono font-bold">
                {formatNumber(measurementResult.distance)} Å
              </span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-white/10">
          <p className="text-white/40 text-xs text-center">
            使用鼠标拖动旋转 · 滚轮缩放
          </p>
        </div>
      </div>
    </div>
  );
}
