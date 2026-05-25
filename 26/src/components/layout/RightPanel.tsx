import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Type, Sun, Palette, Download, Share2, History } from 'lucide-react';
import { DecalEditor } from '@/components/ui/DecalEditor';
import { LightingPanel } from '@/components/ui/LightingPanel';
import { PresetGallery } from '@/components/ui/PresetGallery';
import { ExportPanel } from '@/components/ui/ExportPanel';
import { SharePanel } from '@/components/ui/SharePanel';
import { HistoryBar } from '@/components/ui/HistoryBar';
import { takeScreenshotFromCanvas } from '@/utils/screenshot';
import { cn } from '@/lib/utils';

type TabType = 'decal' | 'lighting' | 'preset' | 'export' | 'share' | 'history';

interface RightPanelProps {
  thumbnail?: string;
  onScreenshot?: (dataUrl: string) => void;
}

export const RightPanel = ({ thumbnail: externalThumbnail, onScreenshot }: RightPanelProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('preset');
  const [localThumbnail, setLocalThumbnail] = useState<string>('');
  
  const thumbnail = externalThumbnail || localThumbnail;

  const handleScreenshot = async () => {
    try {
      const dataUrl = await takeScreenshotFromCanvas(2);
      setLocalThumbnail(dataUrl);
      if (onScreenshot) {
        onScreenshot(dataUrl);
      }
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `my-shoe-design-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  };

  const tabs: { id: TabType; icon: React.ReactNode; label: string }[] = [
    { id: 'preset', icon: <Palette className="w-4 h-4" />, label: '预设' },
    { id: 'decal', icon: <Type className="w-4 h-4" />, label: '贴花' },
    { id: 'lighting', icon: <Sun className="w-4 h-4" />, label: '灯光' },
    { id: 'history', icon: <History className="w-4 h-4" />, label: '历史' },
    { id: 'export', icon: <Download className="w-4 h-4" />, label: '导出' },
    { id: 'share', icon: <Share2 className="w-4 h-4" />, label: '分享' }
  ];

  return (
    <div
      className={cn(
        'h-full bg-gray-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col transition-all duration-300',
        collapsed ? 'w-14' : 'w-80'
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        {!collapsed && (
          <h2 className="text-sm font-semibold text-white">增强功能</h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          {collapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
      </div>

      {!collapsed ? (
        <>
          <div className="flex border-b border-white/10 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-1 min-w-[60px] py-3 px-2 flex flex-col items-center gap-1 text-xs transition-colors shrink-0',
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
            {activeTab === 'decal' && <DecalEditor />}
            {activeTab === 'lighting' && <LightingPanel />}
            {activeTab === 'preset' && <PresetGallery />}
            {activeTab === 'history' && <HistoryBar />}
            {activeTab === 'export' && <ExportPanel onScreenshot={handleScreenshot} />}
            {activeTab === 'share' && <SharePanel thumbnail={thumbnail} />}
          </div>
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

export default RightPanel;
