import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import { formatDate, formatFileSize, formatInterval } from '../../utils/format';
import type { BackupSettings } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

const intervals = [
  { value: 0, label: '关闭' },
  { value: 60, label: '每小时' },
  { value: 360, label: '每6小时' },
  { value: 720, label: '每12小时' },
  { value: 1440, label: '每天' },
  { value: 10080, label: '每周' },
];

const keepOptions = [
  { value: 1, label: '保留1个' },
  { value: 3, label: '保留3个' },
  { value: 7, label: '保留7个' },
  { value: 30, label: '保留30个' },
  { value: 0, label: '全部保留' },
];

const BackupSettingsComponent: React.FC = () => {
  const [backupSettings, setBackupSettings] = useState<BackupSettings | null>(null);
  const [backups, setBackups] = useState<{ path: string; createdAt: number; size: number }[]>([]);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState('');
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [settings, backupList] = await Promise.all([
        window.api.backup.getSettings(),
        window.api.backup.listBackups()
      ]);
      setBackupSettings(settings);
      setBackups(backupList);
    } catch (error) {
      console.error('Failed to load backup data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (updates: Partial<BackupSettings>) => {
    try {
      const updated = await window.api.backup.updateSettings(updates);
      setBackupSettings(updated);
    } catch (error) {
      console.error('Failed to update backup settings:', error);
    }
  };

  const handleChooseDestination = async () => {
    try {
      const result = await window.api.dialog.openDirectory();
      if (result) {
        await handleUpdateSettings({ destination: result });
      }
    } catch (error) {
      console.error('Failed to choose destination:', error);
    }
  };

  const handleStartBackup = async () => {
    if (!confirm('确定要立即备份吗？这可能需要一些时间。')) return;

    setIsBackingUp(true);
    try {
      const success = await window.api.backup.start();
      if (success) {
        alert('备份成功！');
        await loadData();
      } else {
        alert('备份失败，请检查日志。');
      }
    } catch (error: any) {
      alert(`备份失败: ${error.message}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      setErrors({ restore: '请选择要恢复的备份文件' });
      return;
    }

    if (!confirm('确定要从此备份恢复吗？\n\n警告：这将覆盖当前的所有数据！')) return;

    setIsRestoring(true);
    try {
      const success = await window.api.backup.restore(restoreFile);
      if (success) {
        alert('恢复成功！应用将重新加载。');
        window.api.app.reload();
      } else {
        alert('恢复失败，请检查日志。');
      }
    } catch (error: any) {
      alert(`恢复失败: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleChooseRestoreFile = async () => {
    try {
      const result = await window.api.dialog.openFile({
        filters: [{ name: 'Backup Files', extensions: ['bak', 'zip', 'tar.gz'] }]
      });
      if (result) {
        setRestoreFile(result);
        setErrors({});
      }
    } catch (error) {
      console.error('Failed to choose restore file:', error);
    }
  };

  const handleDeleteBackup = async (path: string) => {
    if (!confirm('确定要删除此备份吗？此操作不可撤销。')) return;

    try {
      await window.api.backup.deleteBackup(path);
      await loadData();
    } catch (error) {
      console.error('Failed to delete backup:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">💾 备份与恢复</h2>
        <p className="text-gray-500 dark:text-gray-400">保护您的数据，定期备份邮件和设置</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">自动备份</h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">启用自动备份</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">按照设定的间隔自动创建备份</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={backupSettings?.enabled ?? false}
                  onChange={(e) => handleUpdateSettings({ enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  备份间隔
                </label>
                <select
                  value={backupSettings?.interval || 1440}
                  onChange={(e) => handleUpdateSettings({ interval: parseInt(e.target.value) })}
                  disabled={!backupSettings?.enabled}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {intervals.map(i => (
                    <option key={i.value} value={i.value}>{i.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  保留备份数量
                </label>
                <select
                  value={backupSettings?.keepBackups ?? 7}
                  onChange={(e) => handleUpdateSettings({ keepBackups: parseInt(e.target.value) })}
                  disabled={!backupSettings?.enabled}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  {keepOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                备份位置
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backupSettings?.destination || ''}
                  readOnly
                  placeholder="未设置备份位置"
                  className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none"
                />
                <Button variant="outline" onClick={handleChooseDestination}>
                  选择文件夹
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="include-attachments"
                checked={backupSettings?.includeAttachments ?? true}
                onChange={(e) => handleUpdateSettings({ includeAttachments: e.target.checked })}
                className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
              />
              <label htmlFor="include-attachments" className="text-sm text-gray-700 dark:text-gray-300">
                包含附件（备份文件会更大）
              </label>
            </div>

            {backupSettings?.lastBackupAt && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <span>✅</span>
                  <span className="text-sm">
                    上次备份: {formatDate(backupSettings.lastBackupAt, 'long')}
                    {backupSettings.nextBackupAt && (
                      <> • 下次备份: {formatDate(backupSettings.nextBackupAt, 'relative')}</>
                    )}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">立即备份</h3>
          </div>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            创建当前所有邮件、设置和账户的完整备份
          </p>
          <Button onClick={handleStartBackup} loading={isBackingUp}>
            {isBackingUp ? '备份中...' : '🚀 立即备份'}
          </Button>
        </div>

        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">现有备份</h3>
          {backups.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="text-4xl mb-2">📦</div>
              <p className="text-gray-500 dark:text-gray-400">暂无备份文件</p>
            </div>
          ) : (
            <div className="space-y-3">
              {backups.sort((a, b) => b.createdAt - a.createdAt).map((backup, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">📦</div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {formatDate(backup.createdAt, 'long')}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {formatFileSize(backup.size)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => { setRestoreFile(backup.path); }}
                    >
                      恢复
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteBackup(backup.path)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">从备份恢复</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          选择一个备份文件恢复数据。警告：这将覆盖当前的所有数据！
        </p>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={restoreFile}
              readOnly
              placeholder="选择备份文件..."
              className={`flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm focus:outline-none ${errors.restore ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
            />
            <Button variant="outline" onClick={handleChooseRestoreFile}>
              选择文件
            </Button>
          </div>
          {errors.restore && <p className="text-sm text-red-500">{errors.restore}</p>}
          <Button
            variant="danger"
            onClick={handleRestore}
            loading={isRestoring}
            disabled={!restoreFile}
          >
            {isRestoring ? '恢复中...' : '⚠️ 从此备份恢复'}
          </Button>
        </div>
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-6">
        <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">💡 备份建议</h4>
        <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
          <li>• 定期备份到外部硬盘或云存储，防止数据丢失</li>
          <li>• 备份文件包含您的邮件密码，请妥善保管</li>
          <li>• 恢复前建议先创建当前数据的备份</li>
          <li>• 首次使用前请测试备份和恢复流程</li>
        </ul>
      </div>
    </div>
  );
};

export default BackupSettingsComponent;
