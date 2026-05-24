import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store';
import Button from '../components/ui/Button';
import GeneralSettings from '../components/settings/GeneralSettings';
import AccountSettings from '../components/settings/AccountSettings';
import LabelSettings from '../components/settings/LabelSettings';
import FilterSettings from '../components/settings/FilterSettings';
import SignatureSettings from '../components/settings/SignatureSettings';
import TemplateSettings from '../components/settings/TemplateSettings';
import SecuritySettings from '../components/settings/SecuritySettings';
import BackupSettings from '../components/settings/BackupSettings';
import PluginSettings from '../components/settings/PluginSettings';

declare global {
  interface Window {
    api: any;
  }
}

interface SettingsNavItem {
  id: string;
  label: string;
  icon: string;
  path: string;
}

const navItems: SettingsNavItem[] = [
  { id: 'general', label: '常规设置', icon: '⚙️', path: '/settings/general' },
  { id: 'accounts', label: '账户管理', icon: '👤', path: '/settings/accounts' },
  { id: 'labels', label: '标签管理', icon: '🏷️', path: '/settings/labels' },
  { id: 'filters', label: '过滤规则', icon: '🔍', path: '/settings/filters' },
  { id: 'signatures', label: '签名管理', icon: '✍️', path: '/settings/signatures' },
  { id: 'templates', label: '邮件模板', icon: '📄', path: '/settings/templates' },
  { id: 'security', label: '安全设置', icon: '🔒', path: '/settings/security' },
  { id: 'backup', label: '备份恢复', icon: '💾', path: '/settings/backup' },
  { id: 'plugins', label: '插件管理', icon: '🔌', path: '/settings/plugins' },
];

const SettingsView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings, activeTab, setActiveTab, refreshData } = useStore();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const pathParts = location.pathname.split('/');
    const tab = pathParts[2] || 'general';
    setActiveTab(tab);
  }, [location.pathname, setActiveTab]);

  const handleNavClick = (item: SettingsNavItem) => {
    setActiveTab(item.id);
    navigate(item.path);
  };

  const handleSaveSettings = async (newSettings: any) => {
    setSaving(true);
    try {
      await window.api.settings.update(newSettings);
      await refreshData();
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-950">
      <div className="w-64 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/mail')}>
              ←
            </Button>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">设置</h1>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors
                ${activeTab === item.id
                  ? 'bg-primary-100 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100 font-medium'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            版本: 1.0.0
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/settings/general" replace />} />
            <Route
              path="/general"
              element={
                <GeneralSettings
                  settings={settings}
                  onSave={handleSaveSettings}
                  saving={saving}
                />
              }
            />
            <Route
              path="/accounts"
              element={<AccountSettings />}
            />
            <Route
              path="/labels"
              element={<LabelSettings />}
            />
            <Route
              path="/filters"
              element={<FilterSettings />}
            />
            <Route
              path="/signatures"
              element={<SignatureSettings />}
            />
            <Route
              path="/templates"
              element={<TemplateSettings />}
            />
            <Route
              path="/security"
              element={<SecuritySettings />}
            />
            <Route
              path="/backup"
              element={<BackupSettings />}
            />
            <Route
              path="/plugins"
              element={<PluginSettings />}
            />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
