import React, { useState } from 'react';
import Button from '../ui/Button';
import { useTheme } from '../ThemeProvider';
import type { AppSettings } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

interface GeneralSettingsProps {
  settings: AppSettings | null;
  onSave: (settings: Partial<AppSettings>) => Promise<void>;
  saving: boolean;
}

const languages = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'en-US', name: 'English' },
  { code: 'ja-JP', name: '日本語' },
  { code: 'ko-KR', name: '한국어' },
];

const checkIntervals = [
  { value: 1, label: '每分钟' },
  { value: 5, label: '每5分钟' },
  { value: 10, label: '每10分钟' },
  { value: 15, label: '每15分钟' },
  { value: 30, label: '每30分钟' },
  { value: 60, label: '每小时' },
];

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onSave, saving }) => {
  const { theme, setTheme } = useTheme();
  const [localSettings, setLocalSettings] = useState<Partial<AppSettings>>({
    language: settings?.language || 'zh-CN',
    notifications: settings?.notifications ?? true,
    autoCheck: settings?.autoCheck ?? true,
    checkInterval: settings?.checkInterval || 5,
    preventTracking: settings?.preventTracking ?? true,
    previewPane: settings?.previewPane ?? true,
    threadView: settings?.threadView ?? true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (localSettings.checkInterval && localSettings.checkInterval < 1) {
      newErrors.checkInterval = '检查间隔不能小于1分钟';
    }
    if (localSettings.checkInterval && localSettings.checkInterval > 1440) {
      newErrors.checkInterval = '检查间隔不能大于1440分钟';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await onSave(localSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleChange = (key: keyof AppSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[key];
        return newErrors;
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">⚙️ 常规设置</h2>
        <p className="text-gray-500 dark:text-gray-400">配置应用程序的基本行为</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">外观</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                主题
              </label>
              <div className="flex gap-3">
                {(['light', 'dark', 'system'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`
                      flex-1 p-4 rounded-xl border-2 transition-all
                      ${theme === t
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }
                    `}
                  >
                    <div className="text-2xl mb-2">
                      {t === 'light' ? '☀️' : t === 'dark' ? '🌙' : '🖥️'}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {t === 'light' ? '浅色' : t === 'dark' ? '深色' : '跟随系统'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                语言
              </label>
              <select
                value={localSettings.language}
                onChange={(e) => handleChange('language', e.target.value)}
                className="w-full max-w-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">通知</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">新邮件通知</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">收到新邮件时显示桌面通知</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.notifications}
                  onChange={(e) => handleChange('notifications', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">邮件检查</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">自动检查新邮件</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">定期检查各账户的新邮件</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.autoCheck}
                  onChange={(e) => handleChange('autoCheck', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                检查间隔
              </label>
              <select
                value={localSettings.checkInterval}
                onChange={(e) => handleChange('checkInterval', parseInt(e.target.value))}
                className="w-full max-w-xs px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                disabled={!localSettings.autoCheck}
              >
                {checkIntervals.map(interval => (
                  <option key={interval.value} value={interval.value}>{interval.label}</option>
                ))}
              </select>
              {errors.checkInterval && (
                <p className="mt-1 text-sm text-red-500">{errors.checkInterval}</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">隐私</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">阻止邮件追踪</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">自动阻止邮件中的追踪像素和阅读回执</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.preventTracking}
                  onChange={(e) => handleChange('preventTracking', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">阅读视图</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">预览窗格</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">在邮件列表旁显示邮件内容预览</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.previewPane}
                  onChange={(e) => handleChange('previewPane', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">会话视图</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">按主题分组显示相关邮件</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.threadView}
                  onChange={(e) => handleChange('threadView', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving}>
          保存设置
        </Button>
      </div>
    </div>
  );
};

export default GeneralSettings;
