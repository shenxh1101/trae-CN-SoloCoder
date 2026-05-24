import React, { useState } from 'react';
import Button from '../ui/Button';
import { validatePasswordStrength } from '../../utils/crypto';
import type { EmailAccount, ServerConfig } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

interface AddAccountModalProps {
  onClose: () => void;
  onSave: (account: Omit<EmailAccount, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

const defaultImapPorts: Record<string, number> = {
  gmail: 993,
  outlook: 993,
  qq: 993,
  other: 993,
};

const defaultSmtpPorts: Record<string, number> = {
  gmail: 465,
  outlook: 587,
  qq: 465,
  other: 465,
};

const defaultImapHosts: Record<string, string> = {
  gmail: 'imap.gmail.com',
  outlook: 'outlook.office365.com',
  qq: 'imap.qq.com',
  other: '',
};

const defaultSmtpHosts: Record<string, string> = {
  gmail: 'smtp.gmail.com',
  outlook: 'smtp.office365.com',
  qq: 'smtp.qq.com',
  other: '',
};

const AddAccountModal: React.FC<AddAccountModalProps> = ({ onClose, onSave }) => {
  const [step, setStep] = useState<'basic' | 'auto' | 'manual' | 'config'>('basic');
  const [isAutoDiscovering, setIsAutoDiscovering] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    provider: 'other' as EmailAccount['provider'],
    imap: {
      host: '',
      port: 993,
      secure: true,
      username: '',
      password: '',
    } as ServerConfig,
    smtp: {
      host: '',
      port: 465,
      secure: true,
      username: '',
      password: '',
    } as ServerConfig,
    syncSettings: {
      syncDays: 30,
      maxAttachmentSize: 10,
      autoDownloadAttachments: false,
      syncInterval: 5,
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const passwordStrength = validatePasswordStrength(formData.password);

  const validateBasic = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = '请输入显示名称';
    }
    if (!formData.email.trim()) {
      newErrors.email = '请输入邮箱地址';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '请输入有效的邮箱地址';
    }
    if (!formData.password) {
      newErrors.password = '请输入密码';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.imap.host.trim()) {
      newErrors.imapHost = '请输入IMAP服务器地址';
    }
    if (!formData.imap.port || formData.imap.port < 1 || formData.imap.port > 65535) {
      newErrors.imapPort = '请输入有效的端口号';
    }
    if (!formData.smtp.host.trim()) {
      newErrors.smtpHost = '请输入SMTP服务器地址';
    }
    if (!formData.smtp.port || formData.smtp.port < 1 || formData.smtp.port > 65535) {
      newErrors.smtpPort = '请输入有效的端口号';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProviderChange = (provider: EmailAccount['provider']) => {
    setFormData(prev => ({
      ...prev,
      provider,
      imap: {
        ...prev.imap,
        host: defaultImapHosts[provider],
        port: defaultImapPorts[provider],
        username: prev.email,
        password: prev.password,
      },
      smtp: {
        ...prev.smtp,
        host: defaultSmtpHosts[provider],
        port: defaultSmtpPorts[provider],
        username: prev.email,
        password: prev.password,
      },
    }));
  };

  const handleAutoDiscover = async () => {
    if (!validateBasic()) return;

    setIsAutoDiscovering(true);
    setTestResult(null);
    try {
      const result = await window.api.account.autoDiscover(formData.email, formData.password);
      setFormData(prev => ({
        ...prev,
        provider: result.provider as EmailAccount['provider'],
        imap: {
          ...result.imap,
          username: prev.email,
          password: prev.password,
        },
        smtp: {
          ...result.smtp,
          username: prev.email,
          password: prev.password,
        },
      }));
      setStep('config');
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || '自动发现失败，请手动配置'
      });
      setStep('manual');
    } finally {
      setIsAutoDiscovering(false);
    }
  };

  const handleTestConnection = async () => {
    if (!validateConfig()) return;

    setIsTesting(true);
    setTestResult(null);
    try {
      const success = await window.api.account.test({
        ...formData,
        imap: formData.imap,
        smtp: formData.smtp,
      });
      setTestResult({
        success,
        message: success ? '连接测试成功！' : '连接测试失败，请检查配置。'
      });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || '连接测试失败'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateConfig()) return;

    setIsSaving(true);
    try {
      await onSave({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        provider: formData.provider,
        imap: formData.imap,
        smtp: formData.smtp,
        syncSettings: formData.syncSettings,
      });
      onClose();
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || '保存账户失败'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBasicNext = () => {
    if (!validateBasic()) return;
    handleProviderChange(formData.provider);
    setStep('auto');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {step === 'basic' && '添加邮件账户'}
              {step === 'auto' && '自动配置'}
              {step === 'manual' && '手动配置'}
              {step === 'config' && '确认配置'}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              ✕
            </Button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 'basic' && (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-blue-700 dark:text-blue-300 text-sm">
                  请输入您的邮箱账户信息。我们会尝试自动发现服务器配置。
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  邮箱提供商
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {(['gmail', 'outlook', 'qq', 'other'] as const).map(provider => (
                    <button
                      key={provider}
                      onClick={() => setFormData(prev => ({ ...prev, provider }))}
                      className={`
                        p-4 rounded-xl border-2 transition-all text-center
                        ${formData.provider === provider
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="text-2xl mb-1">
                        {provider === 'gmail' ? '📧' : provider === 'outlook' ? '🪟' : provider === 'qq' ? '🐧' : '📨'}
                      </div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {provider === 'gmail' ? 'Gmail' : provider === 'outlook' ? 'Outlook' : provider === 'qq' ? 'QQ邮箱' : '其他'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  显示名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="您的姓名"
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                />
                {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  邮箱地址 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="your@email.com"
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                />
                {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  密码/授权码 <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="请输入密码或授权码"
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                />
                {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-500 dark:text-gray-400">密码强度:</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength.score <= 2 ? 'text-red-500' :
                        passwordStrength.score <= 3 ? 'text-yellow-500' : 'text-green-500'
                      }`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(score => (
                        <div
                          key={score}
                          className={`h-1.5 flex-1 rounded-full ${
                            score <= passwordStrength.score
                              ? passwordStrength.score <= 2 ? 'bg-red-500' :
                                passwordStrength.score <= 3 ? 'bg-yellow-500' : 'bg-green-500'
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="text-xs text-gray-500 dark:text-gray-400">
                <p>💡 提示：对于 Gmail、Outlook 等邮箱，可能需要使用应用专用密码而非账户密码。</p>
              </div>
            </div>
          )}

          {step === 'auto' && (
            <div className="space-y-6">
              {isAutoDiscovering ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">正在自动发现配置...</h3>
                  <p className="text-gray-500 dark:text-gray-400">正在为您的邮箱查找服务器配置</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                      我们将尝试自动发现您的邮箱服务器配置。如果自动发现失败，您可以手动配置。
                    </p>
                  </div>

                  <div className="text-center py-8">
                    <div className="text-5xl mb-4">🔍</div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">准备自动发现配置</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                      账户: {formData.email}
                    </p>
                  </div>

                  {testResult && (
                    <div className={`p-4 rounded-xl ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                      {testResult.success ? '✅' : '❌'} {testResult.message}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {(step === 'manual' || step === 'config') && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">📥 IMAP 服务器</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        服务器地址
                      </label>
                      <input
                        type="text"
                        value={formData.imap.host}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          imap: { ...prev.imap, host: e.target.value }
                        }))}
                        placeholder="imap.example.com"
                        className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.imapHost ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                      />
                      {errors.imapHost && <p className="mt-1 text-xs text-red-500">{errors.imapHost}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        端口
                      </label>
                      <input
                        type="number"
                        value={formData.imap.port}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          imap: { ...prev.imap, port: parseInt(e.target.value) || 0 }
                        }))}
                        className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.imapPort ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                      />
                      {errors.imapPort && <p className="mt-1 text-xs text-red-500">{errors.imapPort}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="imapSecure"
                        checked={formData.imap.secure}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          imap: { ...prev.imap, secure: e.target.checked }
                        }))}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="imapSecure" className="text-sm text-gray-700 dark:text-gray-300">
                        使用 SSL/TLS 加密
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        用户名
                      </label>
                      <input
                        type="text"
                        value={formData.imap.username}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          imap: { ...prev.imap, username: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        密码
                      </label>
                      <input
                        type="password"
                        value={formData.imap.password}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          imap: { ...prev.imap, password: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">📤 SMTP 服务器</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        服务器地址
                      </label>
                      <input
                        type="text"
                        value={formData.smtp.host}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          smtp: { ...prev.smtp, host: e.target.value }
                        }))}
                        placeholder="smtp.example.com"
                        className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.smtpHost ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                      />
                      {errors.smtpHost && <p className="mt-1 text-xs text-red-500">{errors.smtpHost}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        端口
                      </label>
                      <input
                        type="number"
                        value={formData.smtp.port}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          smtp: { ...prev.smtp, port: parseInt(e.target.value) || 0 }
                        }))}
                        className={`w-full px-3 py-2 bg-white dark:bg-gray-900 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.smtpPort ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
                      />
                      {errors.smtpPort && <p className="mt-1 text-xs text-red-500">{errors.smtpPort}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="smtpSecure"
                        checked={formData.smtp.secure}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          smtp: { ...prev.smtp, secure: e.target.checked }
                        }))}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <label htmlFor="smtpSecure" className="text-sm text-gray-700 dark:text-gray-300">
                        使用 SSL/TLS 加密
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        用户名
                      </label>
                      <input
                        type="text"
                        value={formData.smtp.username}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          smtp: { ...prev.smtp, username: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                        密码
                      </label>
                      <input
                        type="password"
                        value={formData.smtp.password}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          smtp: { ...prev.smtp, password: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-4">⚙️ 同步设置</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      同步邮件天数
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.syncSettings.syncDays}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        syncSettings: { ...prev.syncSettings, syncDays: parseInt(e.target.value) || 30 }
                      }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      同步间隔(分钟)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={formData.syncSettings.syncInterval}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        syncSettings: { ...prev.syncSettings, syncInterval: parseInt(e.target.value) || 5 }
                      }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      最大附件大小(MB)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.syncSettings.maxAttachmentSize}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        syncSettings: { ...prev.syncSettings, maxAttachmentSize: parseInt(e.target.value) || 10 }
                      }))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.syncSettings.autoDownloadAttachments}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          syncSettings: { ...prev.syncSettings, autoDownloadAttachments: e.target.checked }
                        }))}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">自动下载附件</span>
                    </label>
                  </div>
                </div>
              </div>

              {testResult && (
                <div className={`p-4 rounded-xl ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                  {testResult.success ? '✅' : '❌'} {testResult.message}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center justify-between">
            <div>
              {step === 'basic' && (
                <Button variant="ghost" onClick={onClose}>取消</Button>
              )}
              {step !== 'basic' && (
                <Button variant="ghost" onClick={() => setStep(step === 'config' ? 'basic' : 'basic')}>
                  ← 返回
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 'basic' && (
                <Button onClick={handleBasicNext}>下一步 →</Button>
              )}
              {step === 'auto' && (
                <>
                  <Button variant="outline" onClick={() => setStep('manual')} disabled={isAutoDiscovering}>
                    手动配置
                  </Button>
                  <Button onClick={handleAutoDiscover} loading={isAutoDiscovering}>
                    自动发现
                  </Button>
                </>
              )}
              {(step === 'manual' || step === 'config') && (
                <>
                  <Button variant="outline" onClick={handleTestConnection} loading={isTesting}>
                    测试连接
                  </Button>
                  <Button onClick={handleSave} loading={isSaving}>
                    添加账户
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal;
