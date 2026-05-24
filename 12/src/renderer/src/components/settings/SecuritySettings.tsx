import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { formatDate, formatFileSize } from '../../utils/format';
import { generateRandomPassword, validatePasswordStrength } from '../../utils/crypto';
import type { GpgKey } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

const SecuritySettings: React.FC = () => {
  const { gpgKeys, settings, setSettings, setGpgKeys, refreshData } = useStore();
  const [showImportModal, setShowImportModal] = useState(false);
  const [importKeyText, setImportKeyText] = useState('');
  const [importType, setImportType] = useState<'public' | 'private'>('public');
  const [generatingKey, setGeneratingKey] = useState(false);
  const [keyGenForm, setKeyGenForm] = useState({
    name: '',
    email: '',
    passphrase: '',
    keyType: 'rsa' as 'rsa' | 'ecc',
    keySize: 4096
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadKeys = async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Failed to load keys:', error);
      }
    };
    loadKeys();
  }, [refreshData]);

  const validateKeyGen = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!keyGenForm.name.trim()) {
      newErrors.name = '请输入姓名';
    }
    if (!keyGenForm.email.trim()) {
      newErrors.email = '请输入邮箱';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(keyGenForm.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    if (keyGenForm.passphrase.length < 8) {
      newErrors.passphrase = '密码至少8位';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImportKey = async () => {
    if (!importKeyText.trim()) {
      setErrors({ import: '请输入密钥内容' });
      return;
    }

    try {
      const key = await window.api.gpg.importKey(importKeyText.trim());
      setGpgKeys([...gpgKeys, key]);
      setShowImportModal(false);
      setImportKeyText('');
      setErrors({});
    } catch (error: any) {
      setErrors({ import: error.message || '导入密钥失败' });
    }
  };

  const handleGenerateKey = async () => {
    if (!validateKeyGen()) return;

    setGeneratingKey(true);
    try {
      alert('密钥生成功能需要后端GPG服务支持，请在后端实现。\n\n这里仅为演示，实际使用请配置GPG。');
    } catch (error: any) {
      setErrors({ generate: error.message || '生成密钥失败' });
    } finally {
      setGeneratingKey(false);
    }
  };

  const handleDeleteKey = async (keyId: string) => {
    const key = gpgKeys.find(k => k.id === keyId);
    if (!confirm(`确定要删除${key?.type === 'private' ? '私钥' : '公钥'}吗？此操作不可撤销。`)) return;

    try {
      await window.api.gpg.deleteKey(keyId);
      setGpgKeys(gpgKeys.filter(k => k.id !== keyId));
    } catch (error) {
      console.error('Failed to delete key:', error);
    }
  };

  const handleExportKey = async (keyId: string) => {
    try {
      const armored = await window.api.gpg.exportKey(keyId);
      const blob = new Blob([armored], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gpg-key-${keyId}.asc`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export key:', error);
    }
  };

  const handleToggleTrackingProtection = async (value: boolean) => {
    if (settings) {
      const newSettings = { ...settings, preventTracking: value };
      setSettings(newSettings);
      try {
        await window.api.settings.update({ preventTracking: value });
      } catch (error) {
        console.error('Failed to update settings:', error);
      }
    }
  };

  const passwordStrength = validatePasswordStrength(keyGenForm.passphrase);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">🔒 安全设置</h2>
        <p className="text-gray-500 dark:text-gray-400">管理加密密钥和隐私保护设置</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">隐私保护</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <div>
                <div className="font-medium text-gray-900 dark:text-white">阻止邮件追踪</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">自动阻止邮件中的追踪像素、阅读回执和远程内容</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings?.preventTracking ?? true}
                  onChange={(e) => handleToggleTrackingProtection(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">GPG 密钥管理</h3>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowImportModal(true)}>
                导入密钥
              </Button>
              <Button onClick={() => alert('请使用GPG命令行工具生成密钥，然后导入。\n\ngpg --full-generate-key')}>
                生成密钥
              </Button>
            </div>
          </div>

          {gpgKeys.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
              <div className="text-5xl mb-4">🔐</div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">暂无GPG密钥</h4>
              <p className="text-gray-500 dark:text-gray-400 mb-6">导入或生成GPG密钥以支持邮件加密</p>
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={() => setShowImportModal(true)}>
                  导入密钥
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {gpgKeys.map(key => (
                <div
                  key={key.id}
                  className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                        key.type === 'private'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      }`}>
                        {key.type === 'private' ? '🔑' : '🔓'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{key.userId}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            key.type === 'private'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {key.type === 'private' ? '私钥' : '公钥'}
                          </span>
                          {key.isRevoked && (
                            <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full">
                              已吊销
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          <span className="font-mono">Key ID: {key.keyId}</span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>指纹: {key.fingerprint.slice(0, 20)}...</span>
                          <span>创建于: {formatDate(key.createdAt, 'short')}</span>
                          {key.expiresAt && (
                            <span className={key.expiresAt < Date.now() ? 'text-red-500' : ''}>
                              过期: {formatDate(key.expiresAt, 'short')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleExportKey(key.id)}
                      >
                        导出
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDeleteKey(key.id)}
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">加密提示</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <span className="text-xl">💡</span>
            <div>
              <div className="font-medium text-blue-900 dark:text-blue-100">端到端加密</div>
              <div className="text-sm text-blue-700 dark:text-blue-300">
                GPG加密确保只有收件人能解密邮件内容，即使邮件服务器被攻破也无法读取。
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <span className="text-xl">⚠️</span>
            <div>
              <div className="font-medium text-yellow-900 dark:text-yellow-100">私钥安全</div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300">
                请妥善保管您的私钥，使用强密码保护。如果丢失私钥，将无法解密已加密的邮件。
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <span className="text-xl">✅</span>
            <div>
              <div className="font-medium text-green-900 dark:text-green-100">签名验证</div>
              <div className="text-sm text-green-700 dark:text-green-300">
                使用私钥签名邮件，收件人可以用您的公钥验证邮件确实来自您且未被篡改。
              </div>
            </div>
          </div>
        </div>
      </div>

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">导入GPG密钥</h3>
                <Button variant="ghost" size="icon" onClick={() => { setShowImportModal(false); setErrors({}); }}>
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  密钥类型
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setImportType('public')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      importType === 'public'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">🔓</div>
                    <div className="font-medium text-gray-900 dark:text-white">公钥</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">用于加密和验证</div>
                  </button>
                  <button
                    onClick={() => setImportType('private')}
                    className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                      importType === 'private'
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="text-2xl mb-1">🔑</div>
                    <div className="font-medium text-gray-900 dark:text-white">私钥</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">用于解密和签名</div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  密钥内容 (ASCII Armor)
                </label>
                <textarea
                  value={importKeyText}
                  onChange={(e) => setImportKeyText(e.target.value)}
                  placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;...&#10;-----END PGP PUBLIC KEY BLOCK-----"
                  rows={10}
                  className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.import ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                />
                {errors.import && <p className="mt-1 text-sm text-red-500">{errors.import}</p>}
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ 安全提示：请确保您信任此密钥的来源。导入恶意密钥可能导致安全风险。
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setShowImportModal(false); setErrors({}); }}>
                  取消
                </Button>
                <Button onClick={handleImportKey}>
                  导入密钥
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecuritySettings;
