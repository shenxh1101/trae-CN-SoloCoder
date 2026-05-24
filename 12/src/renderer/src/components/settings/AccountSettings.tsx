import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import AddAccountModal from './AddAccountModal';
import { formatInterval, maskEmail } from '../../utils/format';
import type { EmailAccount } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

const AccountSettings: React.FC = () => {
  const { accounts, addAccount, updateAccount, removeAccount, refreshData } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<EmailAccount | null>(null);
  const [testingAccount, setTestingAccount] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ accountId: string; success: boolean; message: string } | null>(null);

  const handleAddAccount = async (accountData: Omit<EmailAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newAccount = await window.api.account.add(accountData);
      addAccount(newAccount);
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add account:', error);
      throw error;
    }
  };

  const handleUpdateAccount = async (id: string, updates: Partial<EmailAccount>) => {
    try {
      const updated = await window.api.account.update(id, updates);
      updateAccount(updated);
      setEditingAccount(null);
    } catch (error) {
      console.error('Failed to update account:', error);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('确定要删除此账户吗？此操作将删除该账户的所有本地数据。')) {
      return;
    }
    try {
      await window.api.account.delete(id);
      removeAccount(id);
    } catch (error) {
      console.error('Failed to delete account:', error);
    }
  };

  const handleTestAccount = async (account: Partial<EmailAccount>) => {
    if (!account.id) return;
    setTestingAccount(account.id);
    setTestResult(null);
    try {
      const success = await window.api.account.test(account);
      setTestResult({
        accountId: account.id,
        success,
        message: success ? '连接测试成功！' : '连接测试失败，请检查配置。'
      });
    } catch (error: any) {
      setTestResult({
        accountId: account.id,
        success: false,
        message: error.message || '连接测试失败'
      });
    } finally {
      setTestingAccount(null);
    }
  };

  const handleSyncAccount = async (accountId: string) => {
    try {
      await window.api.email.sync(accountId);
      await refreshData();
    } catch (error) {
      console.error('Failed to sync account:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">👤 账户管理</h2>
          <p className="text-gray-500 dark:text-gray-400">管理您的邮件账户</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          + 添加账户
        </Button>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="text-6xl mb-4">📧</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">尚未添加账户</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">添加您的第一个邮件账户开始使用</p>
          <Button onClick={() => setShowAddModal(true)}>
            + 添加账户
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {accounts.map(account => (
            <div
              key={account.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-2xl">
                      {account.provider === 'gmail' ? '📧' : account.provider === 'outlook' ? '🪟' : account.provider === 'qq' ? '🐧' : '📨'}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{account.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{maskEmail(account.email)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full">
                          {account.provider}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          同步间隔: {formatInterval(account.syncSettings.syncInterval)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSyncAccount(account.id)}
                    >
                      🔄 同步
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      loading={testingAccount === account.id}
                      onClick={() => handleTestAccount(account)}
                    >
                      测试连接
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingAccount(account)}
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteAccount(account.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>

                {testResult && testResult.accountId === account.id && (
                  <div className={`mt-4 p-3 rounded-lg ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                    {testResult.success ? '✅' : '❌'} {testResult.message}
                  </div>
                )}

                {editingAccount?.id === account.id && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4">编辑账户</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          显示名称
                        </label>
                        <input
                          type="text"
                          value={editingAccount.name}
                          onChange={(e) => setEditingAccount({ ...editingAccount, name: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          邮箱地址
                        </label>
                        <input
                          type="email"
                          value={editingAccount.email}
                          onChange={(e) => setEditingAccount({ ...editingAccount, email: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <h5 className="font-medium text-gray-900 dark:text-white mb-3">同步设置</h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            同步天数
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={editingAccount.syncSettings.syncDays}
                            onChange={(e) => setEditingAccount({
                              ...editingAccount,
                              syncSettings: { ...editingAccount.syncSettings, syncDays: parseInt(e.target.value) }
                            })}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            同步间隔(分钟)
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="1440"
                            value={editingAccount.syncSettings.syncInterval}
                            onChange={(e) => setEditingAccount({
                              ...editingAccount,
                              syncSettings: { ...editingAccount.syncSettings, syncInterval: parseInt(e.target.value) }
                            })}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            最大附件大小(MB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={editingAccount.syncSettings.maxAttachmentSize}
                            onChange={(e) => setEditingAccount({
                              ...editingAccount,
                              syncSettings: { ...editingAccount.syncSettings, maxAttachmentSize: parseInt(e.target.value) }
                            })}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingAccount.syncSettings.autoDownloadAttachments}
                            onChange={(e) => setEditingAccount({
                              ...editingAccount,
                              syncSettings: { ...editingAccount.syncSettings, autoDownloadAttachments: e.target.checked }
                            })}
                            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-gray-300">自动下载附件</span>
                        </label>
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setEditingAccount(null)}>
                        取消
                      </Button>
                      <Button
                        onClick={() => handleUpdateAccount(account.id, editingAccount)}
                      >
                        保存更改
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-800">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">IMAP服务器:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-mono">{account.imap.host}:{account.imap.port}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">SMTP服务器:</span>
                    <span className="ml-2 text-gray-900 dark:text-white font-mono">{account.smtp.host}:{account.smtp.port}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">IMAP加密:</span>
                    <span className={`ml-2 ${account.imap.secure ? 'text-green-600' : 'text-orange-600'}`}>
                      {account.imap.secure ? 'SSL/TLS' : '未加密'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">SMTP加密:</span>
                    <span className={`ml-2 ${account.smtp.secure ? 'text-green-600' : 'text-orange-600'}`}>
                      {account.smtp.secure ? 'SSL/TLS' : '未加密'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <AddAccountModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddAccount}
        />
      )}
    </div>
  );
};

export default AccountSettings;
