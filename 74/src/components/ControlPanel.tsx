import { useState, useRef } from 'react';
import {
  Settings,
  Type,
  Circle,
  Square,
  Triangle,
  Layers,
  Palette,
  Monitor,
  RotateCcw,
  Sparkles,
  Camera,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  Bold,
  RefreshCw,
} from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore';
import { ParticleShape, BackgroundType, FontWeight } from '@/types';

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = true }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-3 px-1 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">{icon}</span>
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="pb-4 space-y-3">{children}</div>}
    </div>
  );
}

export default function ControlPanel() {
  const config = useConfigStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const shapes: { value: ParticleShape; label: string; icon: React.ReactNode }[] = [
    { value: 'sphere', label: '球体', icon: <Circle className="w-4 h-4" /> },
    { value: 'cube', label: '立方体', icon: <Square className="w-4 h-4" /> },
    { value: 'tetrahedron', label: '四面体', icon: <Triangle className="w-4 h-4" /> },
  ];

  const backgrounds: { value: BackgroundType; label: string }[] = [
    { value: 'black', label: '黑色' },
    { value: 'stars', label: '星空' },
    { value: 'white', label: '白色' },
  ];

  const fontWeights: { value: FontWeight; label: string; icon: React.ReactNode }[] = [
    { value: 'normal', label: '常规', icon: <Type className="w-4 h-4" /> },
    { value: 'bold', label: '粗体', icon: <Bold className="w-4 h-4" /> },
  ];

  const handleExport = () => {
    const json = config.exportConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `particle-config-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      config.importConfig(content);
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleScatter = () => {
    (window as any).triggerScatterAnimation?.();
  };

  const handleScreenshot = () => {
    (window as any).takeScreenshot?.();
  };

  return (
    <div className="absolute top-4 right-4 w-72 max-h-[calc(100vh-2rem)] overflow-y-auto bg-black/60 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white">控制面板</h2>
        </div>
      </div>

      <div className="px-4">
        <Section title="文字设置" icon={<Type className="w-4 h-4" />}>
          <div>
            <label className="block text-xs text-gray-400 mb-1">输入文字 (最多10个字符)</label>
            <input
              type="text"
              value={config.text}
              onChange={(e) => config.setText(e.target.value)}
              maxLength={10}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
              placeholder="输入文字..."
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">字体样式</label>
            <div className="flex gap-2">
              {fontWeights.map((weight) => (
                <button
                  key={weight.value}
                  onClick={() => config.setFontWeight(weight.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    config.fontWeight === weight.value
                      ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {weight.icon}
                  {weight.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              文字厚度: {config.thickness} 层
            </label>
            <input
              type="range"
              min="1"
              max="15"
              value={config.thickness}
              onChange={(e) => config.setThickness(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </Section>

        <Section title="粒子设置" icon={<Sparkles className="w-4 h-4" />}>
          <div>
            <label className="block text-xs text-gray-400 mb-2">粒子形状</label>
            <div className="flex gap-2">
              {shapes.map((shape) => (
                <button
                  key={shape.value}
                  onClick={() => config.setParticleShape(shape.value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                    config.particleShape === shape.value
                      ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {shape.icon}
                  {shape.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">
              粒子大小: {config.particleSize.toFixed(2)}
            </label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              value={config.particleSize}
              onChange={(e) => config.setParticleSize(Number(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-pink-400"
            />
          </div>
        </Section>

        <Section title="颜色设置" icon={<Palette className="w-4 h-4" />}>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">顶部颜色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.colorGradient.top}
                  onChange={(e) => config.setColorGradient(e.target.value, config.colorGradient.bottom)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <span className="text-xs text-gray-300 font-mono">{config.colorGradient.top}</span>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-400 mb-1">底部颜色</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.colorGradient.bottom}
                  onChange={(e) => config.setColorGradient(config.colorGradient.top, e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0 bg-transparent"
                />
                <span className="text-xs text-gray-300 font-mono">{config.colorGradient.bottom}</span>
              </div>
            </div>
          </div>
        </Section>

        <Section title="背景设置" icon={<Monitor className="w-4 h-4" />}>
          <div>
            <label className="block text-xs text-gray-400 mb-2">背景样式</label>
            <div className="grid grid-cols-3 gap-2">
              {backgrounds.map((bg) => (
                <button
                  key={bg.value}
                  onClick={() => config.setBackground(bg.value)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                    config.background === bg.value
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {bg.label}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="动画设置" icon={<RotateCcw className="w-4 h-4" />}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">自动旋转</span>
            <button
              onClick={() => config.setAutoRotate(!config.autoRotate)}
              className={`w-12 h-6 rounded-full transition-colors ${
                config.autoRotate ? 'bg-cyan-500' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  config.autoRotate ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          <button
            onClick={handleScatter}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white font-medium hover:opacity-90 transition-opacity shadow-lg shadow-purple-500/30"
          >
            <RefreshCw className="w-4 h-4" />
            散落动画
          </button>
        </Section>

        <Section title="导出与导入" icon={<Download className="w-4 h-4" />}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleScreenshot}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-500 rounded-lg text-white text-xs font-medium hover:bg-emerald-600 transition-colors"
            >
              <Camera className="w-4 h-4" />
              截图
            </button>
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-500 rounded-lg text-white text-xs font-medium hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white/10 rounded-lg text-gray-300 text-xs font-medium hover:bg-white/20 transition-colors"
          >
            <Upload className="w-4 h-4" />
            导入配置
          </button>

          <button
            onClick={() => config.resetConfig()}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-red-500/20 rounded-lg text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            重置配置
          </button>
        </Section>
      </div>
    </div>
  );
}
