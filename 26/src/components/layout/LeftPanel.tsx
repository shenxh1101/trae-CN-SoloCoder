import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Palette, Layers, Grid3X3, Box } from 'lucide-react';
import { PartSelector } from '@/components/ui/PartSelector';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { MaterialSelector } from '@/components/ui/MaterialSelector';
import { TextureSelector } from '@/components/ui/TextureSelector';
import { useConfigStore, useHistoryStore } from '@/store/useConfigStore';
import { cn } from '@/lib/utils';

type TabType = 'parts' | 'color' | 'material' | 'texture';

export const LeftPanel = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('parts');
  
  const selectedPart = useConfigStore((state) => state.selectedPart);
  const config = useConfigStore((state) => state.config);
  const updatePartColor = useConfigStore((state) => state.updatePartColor);
  const updatePartMaterial = useConfigStore((state) => state.updatePartMaterial);
  const updatePartTexture = useConfigStore((state) => state.updatePartTexture);
  const { pushHistory } = useHistoryStore.getState();

  const handleColorChange = (color: string) => {
    if (selectedPart) {
      pushHistory(config);
      updatePartColor(selectedPart, color);
    }
  };

  const handleMaterialChange = (material: any) => {
    if (selectedPart) {
      pushHistory(config);
      updatePartMaterial(selectedPart, material);
    }
  };

  const handleTextureChange = (texture: any) => {
    if (selectedPart) {
      pushHistory(config);
      updatePartTexture(selectedPart, texture);
    }
  };

  const tabs: { id: TabType; icon: React.ReactNode; label: string }[] = [
    { id: 'parts', icon: <Box className="w-4 h-4" />, label: '部件' },
    { id: 'color', icon: <Palette className="w-4 h-4" />, label: '颜色' },
    { id: 'material', icon: <Layers className="w-4 h-4" />, label: '材质' },
    { id: 'texture', icon: <Grid3X3 className="w-4 h-4" />, label: '纹理' }
  ];

  const currentPartConfig = selectedPart ? config.parts[selectedPart] : null;

  return (
    <div
      className={cn(
        'h-full bg-gray-900/95 backdrop-blur-xl border-r border-white/10 flex flex-col transition-all duration-300',
        collapsed ? 'w-14' : 'w-72'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        {!collapsed && (
          <h2 className="text-sm font-semibold text-white">设计定制</h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed ? (
        <>
          <div className="flex border-b border-white/10">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 py-3 px-2 flex flex-col items-center gap-1 text-xs transition-colors',
                  activeTab === tab.id
                    ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-400/10'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                )}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'parts' && <PartSelector />}
            
            {activeTab === 'color' && currentPartConfig && (
              <ColorPicker
                color={currentPartConfig.color}
                onChange={handleColorChange}
              />
            )}
            
            {activeTab === 'material' && selectedPart && currentPartConfig && (
              <MaterialSelector
                part={selectedPart}
                material={currentPartConfig.material}
                onChange={handleMaterialChange}
              />
            )}
            
            {activeTab === 'texture' && selectedPart && currentPartConfig && (
              <TextureSelector
                part={selectedPart}
                texture={currentPartConfig.texture}
                color={currentPartConfig.color}
                onChange={handleTextureChange}
              />
            )}

            {!selectedPart && activeTab !== 'parts' && (
              <div className="text-center py-12 text-white/40">
                <Box className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">请先选择一个部件</p>
              </div>
            )}
          </div>

          {selectedPart && (
            <div className="p-4 border-t border-white/10 bg-black/30">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-white/20"
                  style={{ backgroundColor: currentPartConfig?.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {selectedPart === 'upper' && '鞋面主体'}
                    {selectedPart === 'sole' && '鞋底'}
                    {selectedPart === 'laces' && '鞋带'}
                    {selectedPart === 'logo' && 'Logo标志'}
                    {selectedPart === 'heel' && '后跟支撑片'}
                    {selectedPart === 'tongue' && '鞋舌'}
                    {selectedPart === 'lining' && '内衬'}
                  </p>
                  <p className="text-xs text-white/50 truncate">
                    {currentPartConfig?.color.toUpperCase()}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center py-4 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setCollapsed(false);
                setActiveTab(tab.id);
              }}
              className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center transition-colors',
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-white/40 hover:bg-white/10 hover:text-white/80'
              )}
              title={tab.label}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LeftPanel;
