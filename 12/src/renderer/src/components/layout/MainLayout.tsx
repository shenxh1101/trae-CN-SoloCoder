import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Toolbar } from './Toolbar';
import { useStore } from '../../store';
import { Modal } from '../ui/Modal';
import { Tabs, TabPanel } from '../ui/Tabs';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Checkbox } from '../ui/Checkbox';
import { useTheme } from '../ThemeProvider';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { showSettings, setShowSettings, settings, setSettings } = useStore();
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general');

  const handleSettingChange = (key: string, value: any) => {
    if (settings) {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      window.api.settings.update({ [key]: value });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-950 overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Toolbar />
          <main className="flex-1 overflow-hidden">
            {children}
          </main>
        </div>
      </div>

      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="设置"
        size="xl"
      >
        <Tabs
          tabs={[
            { key: 'general', label: '通用' },
            { key: 'appearance', label: '外观' },
            { key: 'notifications', label: '通知' },
            { key: 'security', label: '安全' },
            { key: 'backup', label: '备份' }
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
        <div className="mt-6">
          <TabPanel activeKey={activeTab} itemKey="general">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
                  基本设置
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        自动检查新邮件
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        定期检查是否有新邮件到达
                      </p>
                    </div>
                    <Checkbox
                      checked={settings?.autoCheck ?? true}
                      onChange={(e) => handleSettingChange('autoCheck', e.target.checked)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      检查间隔（分钟）
                    </label>
                    <Select
                      value={String(settings?.checkInterval ?? 5)}
                      onChange={(e) => handleSettingChange('checkInterval', parseInt(e.target.value))}
                      options={[
                        { value: '1', label: '1 分钟' },
                        { value: '5', label: '5 分钟' },
                        { value: '10', label: '10 分钟' },
                        { value: '15', label: '15 分钟' },
                        { value: '30', label: '30 分钟' },
                        { value: '60', label: '1 小时' }
                      ]}
                      className="w-48"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        线程视图
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        将同一主题的邮件分组显示
                      </p>
                    </div>
                    <Checkbox
                      checked={settings?.threadView ?? true}
                      onChange={(e) => handleSettingChange('threadView', e.target.checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        预览窗格
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        在列表右侧显示邮件预览
                      </p>
                    </div>
                    <Checkbox
                      checked={settings?.previewPane ?? true}
                      onChange={(e) => handleSettingChange('previewPane', e.target.checked)}
                    />
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
                  语言
                </h4>
                <Select
                  value={settings?.language ?? 'zh-CN'}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  options={[
                    { value: 'zh-CN', label: '简体中文' },
                    { value: 'zh-TW', label: '繁體中文' },
                    { value: 'en-US', label: 'English' },
                    { value: 'ja-JP', label: '日本語' }
                  ]}
                  className="w-48"
                />
              </div>
            </div>
          </TabPanel>

          <TabPanel activeKey={activeTab} itemKey="appearance">
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-4">
                  主题
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { value: 'light', label: '浅色', icon: '☀️' },
                    { value: 'dark', label: '深色', icon: '🌙' },
                    { value: 'system', label: '跟随系统', icon: '💻' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setTheme(option.value as 'light' | 'dark' | 'system')}
                      className={`
                        p-4 rounded-xl border-2 text-center transition-all
                        ${theme === option.value
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="text-2xl mb-2">{option.icon}</div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {option.label}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </TabPanel>

          <TabPanel activeKey={activeTab} itemKey="notifications">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    启用通知
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    收到新邮件时显示桌面通知
                  </p>
                </div>
                <Checkbox
                  checked={settings?.notifications ?? true}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                />
              </div>
            </div>
          </TabPanel>

          <TabPanel activeKey={activeTab} itemKey="security">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    防止邮件追踪
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    阻止邮件中的追踪像素和远程内容
                  </p>
                </div>
                <Checkbox
                  checked={settings?.preventTracking ?? true}
                  onChange={(e) => handleSettingChange('preventTracking', e.target.checked)}
                />
              </div>
            </div>
          </TabPanel>

          <TabPanel activeKey={activeTab} itemKey="backup">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    自动备份
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    定期备份邮件数据
                  </p>
                </div>
                <Checkbox
                  checked={settings?.backupSettings?.enabled ?? false}
                  onChange={(e) => handleSettingChange('backupSettings', {
                    ...settings?.backupSettings,
                    enabled: e.target.checked
                  })}
                />
              </div>
              {settings?.backupSettings?.enabled && (
                <div className="space-y-4 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      备份间隔
                    </label>
                    <Select
                      value={String(settings.backupSettings.interval ?? 24)}
                      onChange={(e) => handleSettingChange('backupSettings', {
                        ...settings.backupSettings,
                        interval: parseInt(e.target.value)
                      })}
                      options={[
                        { value: '6', label: '6 小时' },
                        { value: '12', label: '12 小时' },
                        { value: '24', label: '24 小时' },
                        { value: '168', label: '每周' }
                      ]}
                      className="w-48"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                      备份位置
                    </label>
                    <Input
                      value={settings.backupSettings.destination ?? ''}
                      onChange={(e) => handleSettingChange('backupSettings', {
                        ...settings.backupSettings,
                        destination: e.target.value
                      })}
                      placeholder="选择备份目录..."
                      className="max-w-md"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        包含附件
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        备份时包含邮件附件
                      </p>
                    </div>
                    <Checkbox
                      checked={settings.backupSettings.includeAttachments ?? true}
                      onChange={(e) => handleSettingChange('backupSettings', {
                        ...settings.backupSettings,
                        includeAttachments: e.target.checked
                      })}
                    />
                  </div>
                </div>
              )}
            </div>
          </TabPanel>
        </div>
      </Modal>
    </div>
  );
};

export default MainLayout;
