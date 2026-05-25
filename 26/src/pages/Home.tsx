import React, { useEffect, useState, useCallback } from 'react';
import { LeftPanel } from '@/components/layout/LeftPanel';
import { RightPanel } from '@/components/layout/RightPanel';
import { Viewport } from '@/components/layout/Viewport';
import { StatusBar } from '@/components/layout/StatusBar';
import { CompareView } from '@/components/ui/CompareView';
import { useConfigStore } from '@/store/useConfigStore';
import { deserializeConfig } from '@/utils/configSerializer';
import { Sparkles } from 'lucide-react';

export default function Home() {
  const [thumbnail, setThumbnail] = useState<string>('');
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const setConfigName = useConfigStore((state) => state.setConfigName);

  const handleScreenshot = useCallback((dataUrl: string) => {
    setThumbnail(dataUrl);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const configParam = params.get('config');
    
    if (configParam) {
      try {
        const config = deserializeConfig(configParam);
        if (config) {
          loadConfig(config);
          setConfigName('分享的设计');
          window.history.replaceState({}, document.title, '/');
        }
      } catch (error) {
        console.error('Failed to load config from URL:', error);
      }
    }
  }, [loadConfig, setConfigName]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-gray-950">
      <header className="h-14 bg-gray-900/95 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">SoleStudio</h1>
            <p className="text-xs text-white/50">3D 跑鞋定制配置器</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/60">实时渲染中</span>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-medium text-white">
              {useConfigStore.getState().config.name || '未命名设计'}
            </div>
            <div className="text-xs text-white/40 font-mono">
              ID: {useConfigStore.getState().config.id.slice(0, 8)}
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        
        <main className="flex-1 relative overflow-hidden">
          <Viewport onScreenshot={handleScreenshot} />
        </main>
        
        <RightPanel thumbnail={thumbnail} onScreenshot={handleScreenshot} />
      </div>

      <StatusBar />
      
      <CompareView />
    </div>
  );
}
