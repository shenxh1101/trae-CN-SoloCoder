import { Download, Image, Palette, FileJson, Upload } from 'lucide-react';
import { MoleculeData, BackgroundType } from '../types';
import { PRESET_MOLECULES } from '../data/molecules';

interface ToolbarProps {
  currentMolecule: MoleculeData | null;
  background: BackgroundType;
  onMoleculeChange: (molecule: MoleculeData) => void;
  onBackgroundChange: (bg: BackgroundType) => void;
  onExportPNG: () => void;
  onSaveJSON: () => void;
  onLoadJSON: (file: File) => void;
}

export default function Toolbar({
  currentMolecule,
  background,
  onMoleculeChange,
  onBackgroundChange,
  onExportPNG,
  onSaveJSON,
  onLoadJSON,
}: ToolbarProps) {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onLoadJSON(file);
    }
    e.target.value = '';
  };

  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-black/40 backdrop-blur-md border-b border-white/10">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg">分子结构可视化</h1>
            <p className="text-white/60 text-xs">3D Molecular Viewer</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-white/80 text-sm">分子模型:</label>
            <select
              value={currentMolecule?.name || ''}
              onChange={(e) => {
                const mol = PRESET_MOLECULES.find((m) => m.name === e.target.value);
                if (mol) onMoleculeChange(mol);
              }}
              className="bg-white/10 text-white px-3 py-1.5 rounded-lg border border-white/20 focus:outline-none focus:border-blue-400 text-sm"
            >
              {PRESET_MOLECULES.map((mol) => (
                <option key={mol.name} value={mol.name} className="bg-gray-800">
                  {mol.name} ({mol.formula})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => onBackgroundChange('white')}
              className={`w-8 h-8 rounded-md transition-all ${
                background === 'white' ? 'ring-2 ring-blue-400 bg-white' : 'bg-white/50 hover:bg-white'
              }`}
              title="白色背景"
            />
            <button
              onClick={() => onBackgroundChange('black')}
              className={`w-8 h-8 rounded-md transition-all ${
                background === 'black' ? 'ring-2 ring-blue-400 bg-gray-900' : 'bg-gray-900/50 hover:bg-gray-900'
              }`}
              title="黑色背景"
            />
            <button
              onClick={() => onBackgroundChange('gradient')}
              className={`w-8 h-8 rounded-md transition-all ${
                background === 'gradient'
                  ? 'ring-2 ring-blue-400 bg-gradient-to-br from-blue-900 to-purple-900'
                  : 'bg-gradient-to-br from-blue-900/50 to-purple-900/50 hover:from-blue-900 hover:to-purple-900'
              }`}
              title="渐变背景"
            />
            <Palette className="w-4 h-4 text-white/60 mx-1" />
          </div>

          <div className="h-6 w-px bg-white/20" />

          <div className="flex items-center gap-2">
            <button
              onClick={onExportPNG}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm"
              title="导出PNG图片"
            >
              <Image className="w-4 h-4" />
              <span>导出图片</span>
            </button>

            <button
              onClick={onSaveJSON}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors text-sm"
              title="保存为JSON"
            >
              <FileJson className="w-4 h-4" />
              <span>保存配置</span>
            </button>

            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors text-sm cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>加载配置</span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
