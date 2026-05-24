import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { sanitizeHtml } from '../../utils/html';
import type { EmailSignature } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

const SignatureSettings: React.FC = () => {
  const { signatures, accounts, addSignature, updateSignature, removeSignature, refreshData } = useStore();
  const [editingSignature, setEditingSignature] = useState<EmailSignature | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSignature, setNewSignature] = useState({
    name: '',
    html: '',
    plain: '',
    isDefault: false,
    accountId: ''
  });
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadSignatures = async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Failed to load signatures:', error);
      }
    };
    loadSignatures();
  }, [refreshData]);

  const validateSignature = (sig: Partial<EmailSignature>): boolean => {
    const newErrors: Record<string, string> = {};
    if (!sig.name?.trim()) {
      newErrors.name = '请输入签名名称';
    }
    if (!sig.html?.trim() && !sig.plain?.trim()) {
      newErrors.content = '请输入签名内容';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateSignature = async () => {
    if (!validateSignature(newSignature)) return;

    try {
      const signature = await window.api.signature.create({
        ...newSignature,
        name: newSignature.name.trim(),
        accountId: newSignature.accountId || accounts[0]?.id || ''
      });
      addSignature(signature);
      setShowCreateModal(false);
      setNewSignature({ name: '', html: '', plain: '', isDefault: false, accountId: '' });
    } catch (error) {
      console.error('Failed to create signature:', error);
    }
  };

  const handleUpdateSignature = async () => {
    if (!editingSignature) return;
    if (!validateSignature(editingSignature)) return;

    try {
      const updated = await window.api.signature.update(editingSignature.id, {
        ...editingSignature,
        name: editingSignature.name.trim()
      });
      updateSignature(updated);
      setEditingSignature(null);
    } catch (error) {
      console.error('Failed to update signature:', error);
    }
  };

  const handleDeleteSignature = async (id: string) => {
    if (!confirm('确定要删除此签名吗？')) return;

    try {
      await window.api.signature.delete(id);
      removeSignature(id);
    } catch (error) {
      console.error('Failed to delete signature:', error);
    }
  };

  const handleSetDefault = async (signature: EmailSignature) => {
    try {
      const updated = await window.api.signature.update(signature.id, { isDefault: true });
      updateSignature(updated);
    } catch (error) {
      console.error('Failed to set default signature:', error);
    }
  };

  const handleHtmlChange = (html: string, target: 'new' | 'edit') => {
    const plain = html.replace(/<[^>]*>/g, '').trim();
    if (target === 'new') {
      setNewSignature(prev => ({ ...prev, html, plain }));
    } else if (editingSignature) {
      setEditingSignature({ ...editingSignature, html, plain });
    }
  };

  const insertTemplate = (type: string, target: 'new' | 'edit') => {
    const templates: Record<string, string> = {
      simple: '<p>--<br>\n${name}<br>\n${title}<br>\n${company}</p>',
      professional: '<div style="font-family: Arial, sans-serif; font-size: 14px; color: #333;">\n  <p style="margin: 0;">--</p>\n  <p style="margin: 5px 0; font-weight: bold;">${name}</p>\n  <p style="margin: 2px 0; color: #666;">${title} | ${company}</p>\n  <p style="margin: 2px 0; color: #999;">📧 ${email} | 📱 ${phone}</p>\n</div>',
      minimal: '<p>--<br>\n${name}</p>'
    };
    const html = templates[type] || templates.simple;
    handleHtmlChange(html, target);
  };

  const renderSignatureEditor = (sig: Partial<EmailSignature>, target: 'new' | 'edit') => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            签名名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={sig.name || ''}
            onChange={(e) => target === 'new'
              ? setNewSignature(prev => ({ ...prev, name: e.target.value }))
              : editingSignature && setEditingSignature({ ...editingSignature, name: e.target.value })
            }
            placeholder="输入签名名称"
            className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
          />
          {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            关联账户
          </label>
          <select
            value={sig.accountId || ''}
            onChange={(e) => target === 'new'
              ? setNewSignature(prev => ({ ...prev, accountId: e.target.value }))
              : editingSignature && setEditingSignature({ ...editingSignature, accountId: e.target.value })
            }
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({acc.email})</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            签名内容
          </label>
          <div className="flex items-center gap-2">
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
              <button
                onClick={() => setEditorMode('visual')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  editorMode === 'visual'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                可视化
              </button>
              <button
                onClick={() => setEditorMode('html')}
                className={`px-3 py-1 text-xs rounded-md transition-colors ${
                  editorMode === 'html'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                HTML
              </button>
            </div>
            <select
              onChange={(e) => { if (e.target.value) insertTemplate(e.target.value, target); e.target.value = ''; }}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">插入模板</option>
              <option value="simple">简洁</option>
              <option value="professional">专业</option>
              <option value="minimal">极简</option>
            </select>
          </div>
        </div>

        {editorMode === 'visual' ? (
          <div
            contentEditable
            onInput={(e) => handleHtmlChange((e.target as HTMLElement).innerHTML, target)}
            className="w-full h-48 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: sig.html || '' }}
          />
        ) : (
          <textarea
            value={sig.html || ''}
            onChange={(e) => handleHtmlChange(e.target.value, target)}
            placeholder="输入HTML签名"
            className="w-full h-48 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        )}

        {errors.content && <p className="mt-1 text-sm text-red-500">{errors.content}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          预览
        </label>
        <div
          className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(sig.html || '<p>无内容</p>') }}
        />
      </div>

      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={sig.isDefault || false}
            onChange={(e) => target === 'new'
              ? setNewSignature(prev => ({ ...prev, isDefault: e.target.checked }))
              : editingSignature && setEditingSignature({ ...editingSignature, isDefault: e.target.checked })
            }
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">设为默认签名</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">✍️ 签名管理</h2>
          <p className="text-gray-500 dark:text-gray-400">创建和管理邮件签名，支持HTML格式</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + 创建签名
        </Button>
      </div>

      {signatures.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="text-6xl mb-4">✍️</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">暂无签名</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">创建您的第一个邮件签名</p>
          <Button onClick={() => setShowCreateModal(true)}>
            + 创建签名
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {signatures.map(signature => (
            <div
              key={signature.id}
              className={`bg-white dark:bg-gray-900 rounded-xl border overflow-hidden ${
                signature.isDefault ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-200 dark:border-gray-800'
              }`}
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{signature.name}</h3>
                    {signature.isDefault && (
                      <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded-full">
                        默认
                      </span>
                    )}
                    {signature.accountId && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {accounts.find(a => a.id === signature.accountId)?.email}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!signature.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefault(signature)}
                      >
                        设为默认
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingSignature(signature)}
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteSignature(signature.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div
                  className="text-sm"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(signature.html || '<p>无内容</p>') }}
                />
              </div>

              {editingSignature?.id === signature.id && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  {renderSignatureEditor(editingSignature, 'edit')}
                  <div className="mt-6 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => { setEditingSignature(null); setErrors({}); }}>
                      取消
                    </Button>
                    <Button onClick={handleUpdateSignature}>
                      保存更改
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto my-8">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">创建签名</h3>
                <Button variant="ghost" size="icon" onClick={() => { setShowCreateModal(false); setErrors({}); }}>
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6">
              {renderSignatureEditor(newSignature, 'new')}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 sticky bottom-0">
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setShowCreateModal(false); setErrors({}); }}>
                  取消
                </Button>
                <Button onClick={handleCreateSignature}>
                  创建签名
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignatureSettings;
