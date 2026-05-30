import { useRef } from 'react';
import { Camera, Shuffle, Download, Upload, RotateCcw, Palette } from 'lucide-react';
import * as THREE from 'three';
import { useNebulaStore } from '@/store/useNebulaStore';
import { colorThemes, themeList } from '@/config/themes';
import { ColorTheme } from '@/types/nebula';
import { downloadFile, readFileAsText, takeScreenshot } from '@/utils/helpers';

interface ToolbarProps {
  gl?: THREE.WebGLRenderer | null;
}

export function Toolbar({ gl }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    colorTheme,
    autoRotate,
    updateParameter,
    setColorTheme,
    randomizeTheme,
    exportParameters,
    importParameters,
  } = useNebulaStore();

  const handleScreenshot = () => {
    if (gl) {
      takeScreenshot(gl);
    }
  };

  const handleExport = () => {
    const json = exportParameters();
    downloadFile(json, `nebula-config-${Date.now()}.json`, 'application/json');
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const content = await readFileAsText(file);
        importParameters(content);
      } catch (err) {
        console.error('Failed to import file:', err);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const tools = [
    {
      icon: Camera,
      label: '截图',
      onClick: handleScreenshot,
      color: 'cyan',
    },
    {
      icon: Shuffle,
      label: '随机主题',
      onClick: randomizeTheme,
      color: 'pink',
    },
    {
      icon: Download,
      label: '导出JSON',
      onClick: handleExport,
      color: 'green',
    },
    {
      icon: Upload,
      label: '导入JSON',
      onClick: handleImport,
      color: 'yellow',
    },
    {
      icon: RotateCcw,
      label: '自动环绕',
      onClick: () => updateParameter('autoRotate', !autoRotate),
      color: autoRotate ? 'purple' : 'gray',
      active: autoRotate,
    },
  ];

  const colorClasses: Record<string, string> = {
    cyan: 'hover:bg-cyan-500/20 hover:text-cyan-400 hover:border-cyan-500/50',
    pink: 'hover:bg-pink-500/20 hover:text-pink-400 hover:border-pink-500/50',
    green: 'hover:bg-green-500/20 hover:text-green-400 hover:border-green-500/50',
    yellow: 'hover:bg-yellow-500/20 hover:text-yellow-400 hover:border-yellow-500/50',
    purple: 'bg-purple-500/30 text-purple-400 border-purple-500/50',
    gray: 'hover:bg-white/10 hover:text-white hover:border-white/30',
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-[rgba(15,15,35,0.8)] backdrop-blur-md rounded-xl border border-[rgba(139,92,246,0.3)] p-3 shadow-2xl">
          <div className="flex items-center gap-2">
            {tools.map((tool, index) => (
              <button
                key={index}
                onClick={tool.onClick}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-transparent transition-all text-sm font-medium text-gray-300 ${
                  tool.active ? colorClasses[tool.color] : colorClasses[tool.color]
                }`}
              >
                <tool.icon size={18} />
                <span>{tool.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-[rgba(15,15,35,0.8)] backdrop-blur-md rounded-xl border border-[rgba(139,92,246,0.3)] p-3 shadow-2xl">
          <div className="flex items-center gap-2 mb-2">
            <Palette size={16} className="text-gray-400" />
            <span className="text-sm text-gray-300">颜色主题</span>
          </div>
          <div className="flex gap-2">
            {themeList.map((theme: ColorTheme) => {
              const colors = colorThemes[theme];
              return (
                <button
                  key={theme}
                  onClick={() => setColorTheme(theme)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                    colorTheme === theme
                      ? 'bg-[rgba(139,92,246,0.3)] border border-purple-500/50'
                      : 'bg-[rgba(255,255,255,0.05)] border border-transparent hover:bg-[rgba(255,255,255,0.1)]'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${colors.core} 0%, ${colors.mid} 50%, ${colors.outer} 100%)`,
                    }}
                  />
                  <span className={colorTheme === theme ? 'text-white' : 'text-gray-300'}>
                    {colors.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
