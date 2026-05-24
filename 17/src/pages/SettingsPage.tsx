import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Palette,
  Type,
  AlignLeft,
  Map,
  Keyboard,
  Save,
  RotateCcw,
  ChevronDown,
  Check,
  Monitor,
  Moon,
  Sun,
  Eye,
  Code,
  Edit3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Navbar from '@/components/layout/Navbar';
import ShortcutInput from '@/components/settings/ShortcutInput';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEditorStore } from '@/stores/useEditorStore';
import type { EditorSettings } from '@/shared/types';

const themeOptions = [
  { value: 'vs-dark', label: '深色主题', icon: Moon },
  { value: 'vs-light', label: '浅色主题', icon: Sun },
  { value: 'hc-black', label: '高对比度', icon: Monitor },
];

const wordWrapOptions = [
  { value: 'on', label: '开启' },
  { value: 'off', label: '关闭' },
  { value: 'wordWrapColumn', label: '按列换行' },
];

const fontSizeOptions = [12, 13, 14, 15, 16, 17, 18, 20];
const tabSizeOptions = [2, 4, 8];

const shortcutCommands = [
  { key: 'save', label: '保存', description: '保存当前代码片段' },
  { key: 'run', label: '运行', description: '运行当前代码' },
  { key: 'format', label: '格式化', description: '格式化代码' },
  { key: 'comment', label: '注释/取消注释', description: '切换行注释' },
  { key: 'find', label: '查找', description: '在文件中查找' },
  { key: 'replace', label: '替换', description: '在文件中替换' },
] as const;

type SettingsTab = 'editor' | 'keyboard';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const { settings, updateSettings, resetSettings, updateKeybinding } = useEditorStore();
  
  const [activeTab, setActiveTab] = useState<SettingsTab>('editor');
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings);
  const [editingShortcut, setEditingShortcut] = useState<string | null>(null);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [showFontSizeDropdown, setShowFontSizeDropdown] = useState(false);
  const [showTabSizeDropdown, setShowTabSizeDropdown] = useState(false);
  const [showWordWrapDropdown, setShowWordWrapDropdown] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSettingChange = useCallback(<K extends keyof EditorSettings>(
    key: K,
    value: EditorSettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
    setShowThemeDropdown(false);
    setShowFontSizeDropdown(false);
    setShowTabSizeDropdown(false);
    setShowWordWrapDropdown(false);
  }, []);

  const handleSave = useCallback(() => {
    updateSettings(localSettings);
    setHasChanges(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [localSettings, updateSettings]);

  const handleReset = useCallback(() => {
    resetSettings();
    setLocalSettings(settings);
    setHasChanges(false);
  }, [resetSettings, settings]);

  const handleShortcutChange = useCallback((command: string, shortcut: string) => {
    updateKeybinding(command, shortcut);
    setLocalSettings((prev) => ({
      ...prev,
      keybindings: { ...prev.keybindings, [command]: shortcut },
    }));
    setHasChanges(true);
  }, [updateKeybinding]);

  const handleNewSnippet = () => {
    navigate('/editor/new');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const tabs = [
    { key: 'editor' as const, label: '编辑器设置', icon: Code },
    { key: 'keyboard' as const, label: '快捷键', icon: Keyboard },
  ];

  const currentTheme = themeOptions.find(t => t.value === localSettings.theme) || themeOptions[0];

  const ToggleSwitch = ({
    checked,
    onChange,
    label,
  }: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label: string;
  }) => (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
      )}
    >
      <span className="sr-only">{label}</span>
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );

  const DropdownField = ({
    label,
    value,
    options,
    isOpen,
    onToggle,
    onSelect,
    renderValue,
    icon: Icon,
  }: {
    label: string;
    value: any;
    options: readonly { value: any; label: string; icon?: any }[];
    isOpen: boolean;
    onToggle: () => void;
    onSelect: (value: any) => void;
    renderValue?: (value: any) => React.ReactNode;
    icon?: React.ComponentType<{ className?: string }>;
  }) => (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
        >
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4 text-gray-400" />}
            {renderValue ? renderValue(value) : options.find(o => o.value === value)?.label}
          </div>
          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', { 'rotate-180': isOpen })} />
        </button>
        
        {isOpen && (
          <div className="absolute top-full left-0 z-20 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
            {options.map((option) => {
              const OptionIcon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => onSelect(option.value)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition-colors',
                    value === option.value
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                  )}
                >
                  {OptionIcon && <OptionIcon className="h-4 w-4" />}
                  {option.label}
                  {value === option.value && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <Navbar user={user} onLogout={logout} onLogin={handleLogin} onNewSnippet={handleNewSnippet} />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
              <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">设置</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                自定义你的编辑器体验
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              <RotateCcw className="h-4 w-4" />
              重置
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
            >
              {saved ? (
                <>
                  <Check className="h-4 w-4" />
                  已保存
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  保存更改
                </>
              )}
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="border-b border-gray-200 dark:border-gray-800">
            <nav className="flex">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'inline-flex items-center gap-2 border-b-2 px-6 py-4 text-sm font-medium transition-colors',
                      activeTab === tab.key
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'editor' && (
              <div className="space-y-8">
                <div className="grid gap-6 md:grid-cols-2">
                  <DropdownField
                    label="主题"
                    value={localSettings.theme}
                    options={themeOptions}
                    isOpen={showThemeDropdown}
                    onToggle={() => setShowThemeDropdown(!showThemeDropdown)}
                    onSelect={(value) => handleSettingChange('theme', value)}
                    renderValue={(value) => {
                      const theme = themeOptions.find(t => t.value === value);
                      const ThemeIcon = theme?.icon;
                      return (
                        <span className="flex items-center gap-2">
                          {ThemeIcon && <ThemeIcon className="h-4 w-4" />}
                          {theme?.label}
                        </span>
                      );
                    }}
                  />

                  <DropdownField
                    label="字体大小"
                    value={localSettings.fontSize}
                    options={fontSizeOptions.map(size => ({ value: size, label: `${size}px` }))}
                    isOpen={showFontSizeDropdown}
                    onToggle={() => setShowFontSizeDropdown(!showFontSizeDropdown)}
                    onSelect={(value) => handleSettingChange('fontSize', value)}
                    icon={Type}
                  />

                  <DropdownField
                    label="Tab 大小"
                    value={localSettings.tabSize}
                    options={tabSizeOptions.map(size => ({ value: size, label: `${size} 空格` }))}
                    isOpen={showTabSizeDropdown}
                    onToggle={() => setShowTabSizeDropdown(!showTabSizeDropdown)}
                    onSelect={(value) => handleSettingChange('tabSize', value)}
                    icon={AlignLeft}
                  />

                  <DropdownField
                    label="自动换行"
                    value={localSettings.wordWrap}
                    options={wordWrapOptions}
                    isOpen={showWordWrapDropdown}
                    onToggle={() => setShowWordWrapDropdown(!showWordWrapDropdown)}
                    onSelect={(value) => handleSettingChange('wordWrap', value)}
                    icon={Eye}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    编辑器选项
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <Map className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">迷你地图</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            在编辑器右侧显示代码缩略图
                          </p>
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={localSettings.minimap}
                        onChange={(value) => handleSettingChange('minimap', value)}
                        label="迷你地图"
                      />
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 dark:bg-purple-900/30">
                          <Edit3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">使用空格代替 Tab</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            按下 Tab 键时插入空格
                          </p>
                        </div>
                      </div>
                      <ToggleSwitch
                        checked={localSettings.insertSpaces}
                        onChange={(value) => handleSettingChange('insertSpaces', value)}
                        label="使用空格代替 Tab"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-800/50">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                    预览
                  </h3>
                  <div className="h-48 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className={cn(
                      'h-full w-full p-4 font-mono text-sm',
                      localSettings.theme === 'vs-light' ? 'bg-white text-gray-900' : 'bg-gray-900 text-gray-100',
                      localSettings.theme === 'hc-black' && 'bg-black text-white'
                    )}
                    style={{ fontSize: `${localSettings.fontSize}px` }}
                    >
                      <pre style={{ tabSize: localSettings.tabSize }}>
{`function helloWorld() {
${' '.repeat(localSettings.tabSize)}console.log('Hello, CodeShare!');
${' '.repeat(localSettings.tabSize)}// 这是一个预览
}

helloWorld();`}
                      </pre>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keyboard' && (
              <div className="space-y-6">
                <div className="rounded-lg border border-gray-100 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    点击快捷键进行修改，然后按下新的组合键。支持 Ctrl、Shift、Alt 修饰键。
                  </p>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-800/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                          命令
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                          描述
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
                          快捷键
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                      {shortcutCommands.map((command) => (
                        <tr
                          key={command.key}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                            {command.label}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                            {command.description}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {editingShortcut === command.key ? (
                              <ShortcutInput
                                value={localSettings.keybindings[command.key]}
                                onChange={(shortcut) => handleShortcutChange(command.key, shortcut)}
                                onCancel={() => setEditingShortcut(null)}
                              />
                            ) : (
                              <button
                                onClick={() => setEditingShortcut(command.key)}
                                className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm font-mono text-gray-700 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-blue-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                              >
                                {localSettings.keybindings[command.key]?.split('+').map((key, idx) => (
                                  <span key={idx}>
                                    {idx > 0 && ' + '}
                                    <kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs dark:bg-gray-700">
                                      {key}
                                    </kbd>
                                  </span>
                                ))}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
