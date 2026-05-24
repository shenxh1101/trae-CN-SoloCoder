import { useState } from 'react';
import { X, Palette, Type, Save, Clock, Image, Server, Key } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import type { UploadConfig } from '../../types';

interface SettingsModalProps {
  onClose: () => void;
}

type TabType = 'appearance' | 'editor' | 'autoSave' | 'version' | 'imageUpload' | 'about';

const FONT_FAMILIES = [
  { value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', label: '系统默认' },
  { value: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif', label: '苹方' },
  { value: '"Noto Sans SC", "Source Han Sans SC", sans-serif', label: '思源黑体' },
  { value: 'Georgia, "Times New Roman", serif', label: 'Georgia' },
];

const EDITOR_FONTS = [
  { value: '"JetBrains Mono", "Fira Code", Menlo, Monaco, monospace', label: 'JetBrains Mono' },
  { value: '"Fira Code", "JetBrains Mono", Menlo, Monaco, monospace', label: 'Fira Code' },
  { value: '"SF Mono", Menlo, Monaco, "Courier New", monospace', label: 'SF Mono' },
  { value: 'Menlo, Monaco, "Courier New", monospace', label: 'Menlo' },
  { value: '"Source Code Pro", "Consolas", monospace', label: 'Source Code Pro' },
];

const AUTO_SAVE_INTERVALS = [
  { value: 10000, label: '10 秒' },
  { value: 30000, label: '30 秒' },
  { value: 60000, label: '1 分钟' },
  { value: 300000, label: '5 分钟' },
];

const VERSION_INTERVALS = [
  { value: 60000, label: '1 分钟' },
  { value: 300000, label: '5 分钟' },
  { value: 600000, label: '10 分钟' },
  { value: 1800000, label: '30 分钟' },
];

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('appearance');
  const { settings, updateSettings, setTheme, setFontFamily, setFontSize, setEditorFontFamily, setEditorFontSize } = useSettingsStore();

  const [imageUploadConfig, setImageUploadConfig] = useState<UploadConfig>(settings.imageUpload);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async () => {
    if (hasChanges) {
      await updateSettings({ imageUpload: imageUploadConfig });
    }
    onClose();
  };

  const tabs = [
    { id: 'appearance' as TabType, icon: Palette, label: '外观' },
    { id: 'editor' as TabType, icon: Type, label: '编辑器' },
    { id: 'autoSave' as TabType, icon: Save, label: '自动保存' },
    { id: 'version' as TabType, icon: Clock, label: '版本控制' },
    { id: 'imageUpload' as TabType, icon: Image, label: '图片上传' },
    { id: 'about' as TabType, icon: Server, label: '关于' },
  ];

  const renderAppearance = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">主题</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: '亮色', icon: '☀️' },
            { value: 'dark', label: '暗色', icon: '🌙' },
            { value: 'system', label: '跟随系统', icon: '🖥️' },
          ].map((theme) => (
            <button
              key={theme.value}
              onClick={() => setTheme(theme.value as 'light' | 'dark' | 'system')}
              className={`p-4 rounded-lg border text-center transition-all ${
                settings.theme === theme.value
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                  : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]/50'
              }`}
            >
              <div className="text-2xl mb-1">{theme.icon}</div>
              <div className="text-sm">{theme.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">界面字体</label>
        <select
          value={settings.fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          className="select w-full"
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">界面字号: {settings.fontSize}px</label>
        <input
          type="range"
          min="12"
          max="18"
          value={settings.fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>12px</span>
          <span>18px</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">行高: {settings.lineHeight}</label>
        <input
          type="range"
          min="1.2"
          max="2.0"
          step="0.1"
          value={settings.lineHeight}
          onChange={(e) => updateSettings({ lineHeight: Number(e.target.value) })}
          className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>紧凑</span>
          <span>宽松</span>
        </div>
      </div>
    </div>
  );

  const renderEditor = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">编辑器字体</label>
        <select
          value={settings.editorFontFamily}
          onChange={(e) => setEditorFontFamily(e.target.value)}
          className="select w-full"
        >
          {EDITOR_FONTS.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">编辑器字号: {settings.editorFontSize}px</label>
        <input
          type="range"
          min="12"
          max="20"
          value={settings.editorFontSize}
          onChange={(e) => setEditorFontSize(Number(e.target.value))}
          className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>12px</span>
          <span>20px</span>
        </div>
      </div>

      <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg font-mono text-sm" style={{ fontFamily: settings.editorFontFamily, fontSize: settings.editorFontSize }}>
        <p className="text-[var(--text-primary)]"># 示例标题</p>
        <p className="text-[var(--text-muted)] mt-2">这是一段示例文本，用于预览编辑器字体效果。</p>
        <p className="text-[var(--accent-primary)] mt-2">`const code = "hello world";`</p>
      </div>
    </div>
  );

  const renderAutoSave = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">自动保存</div>
          <div className="text-sm text-[var(--text-muted)]">编辑时自动保存笔记更改</div>
        </div>
        <button
          onClick={() => updateSettings({ autoSave: !settings.autoSave })}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            settings.autoSave ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)]'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
              settings.autoSave ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {settings.autoSave && (
        <div>
          <label className="block text-sm font-medium mb-2">自动保存间隔</label>
          <select
            value={settings.autoSaveInterval}
            onChange={(e) => updateSettings({ autoSaveInterval: Number(e.target.value) })}
            className="select w-full"
          >
            {AUTO_SAVE_INTERVALS.map((interval) => (
              <option key={interval.value} value={interval.value}>
                {interval.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );

  const renderVersion = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">版本快照间隔</label>
        <select
          value={settings.versionSnapshotInterval}
          onChange={(e) => updateSettings({ versionSnapshotInterval: Number(e.target.value) })}
          className="select w-full"
        >
          {VERSION_INTERVALS.map((interval) => (
            <option key={interval.value} value={interval.value}>
              {interval.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-[var(--text-muted)] mt-1">保存时创建历史版本快照的最小间隔</p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">最大版本数: {settings.maxSnapshotsPerNote}</label>
        <input
          type="range"
          min="10"
          max="100"
          step="10"
          value={settings.maxSnapshotsPerNote}
          onChange={(e) => updateSettings({ maxSnapshotsPerNote: Number(e.target.value) })}
          className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>10</span>
          <span>100</span>
        </div>
      </div>

      <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg">
        <div className="text-sm font-medium mb-2">💡 提示</div>
        <div className="text-sm text-[var(--text-muted)]">
          版本历史保存在每个笔记本的 .marknote/versions 目录下。
          您可以随时浏览和恢复历史版本。
        </div>
      </div>
    </div>
  );

  const renderImageUpload = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-2">上传方式</label>
        <div className="space-y-2">
          {[
            { value: 'local', label: '本地保存', icon: '💾', desc: '图片保存到本地笔记本目录' },
            { value: 'qiniu', label: '七牛云', icon: '☁️', desc: '上传到七牛云对象存储' },
            { value: 'upyun', label: '又拍云', icon: '🚀', desc: '上传到又拍云存储服务' },
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => {
                setImageUploadConfig({ ...imageUploadConfig, type: type.value as UploadConfig['type'] });
                setHasChanges(true);
              }}
              className={`w-full p-3 rounded-lg border text-left transition-all flex items-center gap-3 ${
                imageUploadConfig.type === type.value
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/10'
                  : 'border-[var(--border-color)] hover:border-[var(--accent-primary)]/50'
              }`}
            >
              <span className="text-xl">{type.icon}</span>
              <div>
                <div className="font-medium">{type.label}</div>
                <div className="text-xs text-[var(--text-muted)]">{type.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {imageUploadConfig.type === 'local' && (
        <div>
          <label className="block text-sm font-medium mb-2">本地保存路径</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={imageUploadConfig.localPath || ''}
              onChange={(e) => {
                setImageUploadConfig({ ...imageUploadConfig, localPath: e.target.value });
                setHasChanges(true);
              }}
              placeholder="images"
              className="input flex-1"
            />
            <button
              onClick={async () => {
                if (window.electronAPI) {
                  const result = await window.electronAPI.app.showOpenDialog({
                    properties: ['openDirectory'],
                  });
                  if (result && !result.canceled && result.filePaths.length > 0) {
                    setImageUploadConfig({ ...imageUploadConfig, localPath: result.filePaths[0] });
                    setHasChanges(true);
                  }
                }
              }}
              className="btn btn-secondary"
            >
              选择
            </button>
          </div>
        </div>
      )}

      {imageUploadConfig.type === 'qiniu' && (
        <div className="space-y-4">
          <div className="p-3 bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/30 rounded-lg text-sm text-[var(--text-muted)]">
            <Key size={14} className="inline mr-1" />
            请确保您的七牛云账户已开通对象存储服务
          </div>
          {['accessKey', 'secretKey', 'bucket', 'domain', 'region'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1 capitalize">{field}</label>
              <input
                type={field === 'secretKey' ? 'password' : 'text'}
                value={(imageUploadConfig.qiniu as Record<string, string>)?.[field] || ''}
                onChange={(e) => {
                  setImageUploadConfig({
                    ...imageUploadConfig,
                    qiniu: {
                      ...(imageUploadConfig.qiniu || { accessKey: '', secretKey: '', bucket: '', domain: '', region: '' }),
                      [field]: e.target.value,
                    },
                  });
                  setHasChanges(true);
                }}
                className="input w-full"
                placeholder={`请输入 ${field}`}
              />
            </div>
          ))}
        </div>
      )}

      {imageUploadConfig.type === 'upyun' && (
        <div className="space-y-4">
          <div className="p-3 bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/30 rounded-lg text-sm text-[var(--text-muted)]">
            <Key size={14} className="inline mr-1" />
            请确保您的又拍云账户已创建服务并授权操作员
          </div>
          {['serviceName', 'operatorName', 'operatorPassword', 'domain'].map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1 capitalize">
                {field === 'serviceName' ? '服务名' : field === 'operatorName' ? '操作员名' : field === 'operatorPassword' ? '操作员密码' : '域名'}
              </label>
              <input
                type={field === 'operatorPassword' ? 'password' : 'text'}
                value={(imageUploadConfig.upyun as Record<string, string>)?.[field] || ''}
                onChange={(e) => {
                  setImageUploadConfig({
                    ...imageUploadConfig,
                    upyun: {
                      ...(imageUploadConfig.upyun || { serviceName: '', operatorName: '', operatorPassword: '', domain: '' }),
                      [field]: e.target.value,
                    },
                  });
                  setHasChanges(true);
                }}
                className="input w-full"
                placeholder={`请输入 ${field === 'serviceName' ? '服务名' : field === 'operatorName' ? '操作员名' : field === 'operatorPassword' ? '操作员密码' : '域名'}`}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAbout = () => (
    <div className="space-y-6 text-center">
      <div className="text-6xl mb-4">📝</div>
      <h2 className="text-xl font-bold">MarkNote</h2>
      <p className="text-[var(--text-muted)]">v1.0.0</p>
      <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
        一个功能强大的本地 Markdown 笔记应用，支持实时预览、LaTeX 数学公式、Mermaid 图表、双向链接等功能。
      </p>
      <div className="pt-4 border-t border-[var(--border-color)]">
        <p className="text-xs text-[var(--text-muted)]">
          基于 Electron + React + TypeScript 构建
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          © 2024 MarkNote. All rights reserved.
        </p>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'appearance':
        return renderAppearance();
      case 'editor':
        return renderEditor();
      case 'autoSave':
        return renderAutoSave();
      case 'version':
        return renderVersion();
      case 'imageUpload':
        return renderImageUpload();
      case 'about':
        return renderAbout();
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="w-full max-w-2xl h-[70vh] bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-color)]">
          <h2 className="text-lg font-semibold">设置</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-48 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex-shrink-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full px-4 py-3 flex items-center gap-2 text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border-r-2 border-[var(--accent-primary)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
                }`}
              >
                <tab.icon size={16} />
                <span className="text-sm">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-4 py-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]">
          <button onClick={onClose} className="btn btn-ghost">
            取消
          </button>
          <button onClick={handleSave} className="btn btn-primary">
            <Save size={16} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
