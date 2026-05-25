import React, { useState } from 'react';
import { Download, Link, FileJson, Camera, Check, Copy } from 'lucide-react';
import { useConfigStore } from '@/store/useConfigStore';
import { downloadConfigFile, generateShareLink, readConfigFromFile } from '@/utils/configSerializer';
import { cn } from '@/lib/utils';

interface ExportPanelProps {
  onScreenshot?: () => void;
  className?: string;
}

export const ExportPanel = ({ onScreenshot, className }: ExportPanelProps) => {
  const config = useConfigStore((state) => state.config);
  const loadConfig = useConfigStore((state) => state.loadConfig);
  const [copied, setCopied] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleCopyLink = async () => {
    const link = generateShareLink(config);
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleDownloadJson = () => {
    downloadConfigFile(config);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const importedConfig = await readConfigFromFile(file);
      if (importedConfig) {
        loadConfig(importedConfig);
      } else {
        alert('无效的配置文件');
      }
    } catch (error) {
      console.error('Failed to import config:', error);
      alert('导入配置失败');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Download className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium text-white">导出与分享</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={onScreenshot}
          className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-white/5 border-white/20 hover:bg-white/10 hover:border-cyan-400 transition-all text-white group"
        >
          <Camera className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs">高清截图</span>
        </button>

        <button
          onClick={handleCopyLink}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all text-white group',
            copied
              ? 'bg-green-500/20 border-green-400'
              : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-cyan-400'
          )}
        >
          {copied ? (
            <Check className="w-6 h-6 text-green-400" />
          ) : (
            <Link className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
          )}
          <span className="text-xs">{copied ? '已复制!' : '复制链接'}</span>
        </button>

        <button
          onClick={handleDownloadJson}
          className="flex flex-col items-center gap-2 p-4 rounded-lg border bg-white/5 border-white/20 hover:bg-white/10 hover:border-cyan-400 transition-all text-white group"
        >
          <FileJson className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs">导出JSON</span>
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className={cn(
            'flex flex-col items-center gap-2 p-4 rounded-lg border transition-all text-white group',
            importing
              ? 'bg-white/10 border-white/10 cursor-not-allowed'
              : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-cyan-400'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
          <Copy className="w-6 h-6 text-cyan-400 group-hover:scale-110 transition-transform" />
          <span className="text-xs">{importing ? '导入中...' : '导入JSON'}</span>
        </button>
      </div>

      <div className="p-3 bg-white/5 rounded-lg space-y-2">
        <div className="text-xs text-white/60 font-medium">配置信息</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-white/50">配置ID:</div>
          <div className="text-white/80 font-mono truncate">{config.id.slice(0, 12)}...</div>
          <div className="text-white/50">创建时间:</div>
          <div className="text-white/80">
            {new Date(config.createdAt).toLocaleString('zh-CN')}
          </div>
          <div className="text-white/50">最后修改:</div>
          <div className="text-white/80">
            {new Date(config.updatedAt).toLocaleString('zh-CN')}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel;
