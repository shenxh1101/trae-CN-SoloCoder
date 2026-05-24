import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import Button from '../ui/Button';
import { sanitizeHtml } from '../../utils/html';
import type { EmailTemplate } from '@shared/types';

declare global {
  interface Window {
    api: any;
  }
}

const TemplateSettings: React.FC = () => {
  const { templates, addTemplate, updateTemplate, removeTemplate, refreshData } = useStore();
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    subject: '',
    body: { html: '', plain: '' },
    attachments: [] as string[]
  });
  const [editorMode, setEditorMode] = useState<'visual' | 'html'>('visual');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        await refreshData();
      } catch (error) {
        console.error('Failed to load templates:', error);
      }
    };
    loadTemplates();
  }, [refreshData]);

  const validateTemplate = (tpl: Partial<EmailTemplate>): boolean => {
    const newErrors: Record<string, string> = {};
    if (!tpl.name?.trim()) {
      newErrors.name = '请输入模板名称';
    }
    if (!tpl.subject?.trim()) {
      newErrors.subject = '请输入邮件主题';
    }
    if (!tpl.body?.html?.trim() && !tpl.body?.plain?.trim()) {
      newErrors.content = '请输入邮件内容';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateTemplate = async () => {
    if (!validateTemplate(newTemplate)) return;

    try {
      const template = await window.api.template.create({
        ...newTemplate,
        name: newTemplate.name.trim(),
        subject: newTemplate.subject.trim()
      });
      addTemplate(template);
      setShowCreateModal(false);
      setNewTemplate({ name: '', subject: '', body: { html: '', plain: '' }, attachments: [] });
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;
    if (!validateTemplate(editingTemplate)) return;

    try {
      const updated = await window.api.template.update(editingTemplate.id, {
        ...editingTemplate,
        name: editingTemplate.name.trim(),
        subject: editingTemplate.subject.trim()
      });
      updateTemplate(updated);
      setEditingTemplate(null);
    } catch (error) {
      console.error('Failed to update template:', error);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('确定要删除此模板吗？')) return;

    try {
      await window.api.template.delete(id);
      removeTemplate(id);
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const handleUseTemplate = async (template: EmailTemplate) => {
    useStore.getState().setShowCompose(true, {
      subject: template.subject,
      body: template.body
    });
  };

  const handleHtmlChange = (html: string, target: 'new' | 'edit') => {
    const plain = html.replace(/<[^>]*>/g, '').trim();
    if (target === 'new') {
      setNewTemplate(prev => ({ ...prev, body: { html, plain } }));
    } else if (editingTemplate) {
      setEditingTemplate({ ...editingTemplate, body: { html, plain } });
    }
  };

  const insertVariable = (variable: string, target: 'new' | 'edit') => {
    const textarea = document.querySelector(target === 'new' ? '#new-template-subject' : '#edit-template-subject') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const subject = target === 'new' ? newTemplate.subject : editingTemplate?.subject || '';
      const newSubject = subject.substring(0, start) + variable + subject.substring(end);
      if (target === 'new') {
        setNewTemplate(prev => ({ ...prev, subject: newSubject }));
      } else if (editingTemplate) {
        setEditingTemplate({ ...editingTemplate, subject: newSubject });
      }
    }
  };

  const renderTemplateEditor = (tpl: Partial<EmailTemplate>, target: 'new' | 'edit') => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          模板名称 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={tpl.name || ''}
          onChange={(e) => target === 'new'
            ? setNewTemplate(prev => ({ ...prev, name: e.target.value }))
            : editingTemplate && setEditingTemplate({ ...editingTemplate, name: e.target.value })
          }
          placeholder="输入模板名称"
          className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
        />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            邮件主题 <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-1">
            {['${name}', '${email}', '${date}', '${company}'].map(v => (
              <button
                key={v}
                onClick={() => insertVariable(v, target)}
                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <input
          id={target === 'new' ? 'new-template-subject' : 'edit-template-subject'}
          type="text"
          value={tpl.subject || ''}
          onChange={(e) => target === 'new'
            ? setNewTemplate(prev => ({ ...prev, subject: e.target.value }))
            : editingTemplate && setEditingTemplate({ ...editingTemplate, subject: e.target.value })
          }
          placeholder="输入邮件主题，可使用变量"
          className={`w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.subject ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}`}
        />
        {errors.subject && <p className="mt-1 text-sm text-red-500">{errors.subject}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            邮件内容
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
          </div>
        </div>

        {editorMode === 'visual' ? (
          <div
            contentEditable
            onInput={(e) => handleHtmlChange((e.target as HTMLElement).innerHTML, target)}
            className="w-full h-64 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: tpl.body?.html || '' }}
          />
        ) : (
          <textarea
            value={tpl.body?.html || ''}
            onChange={(e) => handleHtmlChange(e.target.value, target)}
            placeholder="输入HTML邮件内容"
            className="w-full h-64 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        )}

        {errors.content && <p className="mt-1 text-sm text-red-500">{errors.content}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          预览
        </label>
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <span className="text-sm text-gray-500 dark:text-gray-400">主题: </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">{tpl.subject || '(无主题)'}</span>
          </div>
          <div
            className="p-4 bg-white dark:bg-gray-900"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(tpl.body?.html || '<p>无内容</p>') }}
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">📄 邮件模板</h2>
          <p className="text-gray-500 dark:text-gray-400">创建和管理常用邮件模板</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          + 创建模板
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">暂无模板</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">创建常用邮件模板提高效率</p>
          <Button onClick={() => setShowCreateModal(true)}>
            + 创建模板
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      主题: {template.subject}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleUseTemplate(template)}
                    >
                      使用
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTemplate(template)}
                    >
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      删除
                    </Button>
                  </div>
                </div>
              </div>
              <div className="p-4">
                <div
                  className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3"
                  dangerouslySetInnerHTML={{ __html: sanitizeHtml(template.body.html || template.body.plain || '<p>无内容</p>') }}
                />
              </div>

              {editingTemplate?.id === template.id && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                  {renderTemplateEditor(editingTemplate, 'edit')}
                  <div className="mt-6 flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => { setEditingTemplate(null); setErrors({}); }}>
                      取消
                    </Button>
                    <Button onClick={handleUpdateTemplate}>
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
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">创建邮件模板</h3>
                <Button variant="ghost" size="icon" onClick={() => { setShowCreateModal(false); setErrors({}); }}>
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6">
              {renderTemplateEditor(newTemplate, 'new')}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 sticky bottom-0">
              <div className="flex justify-end gap-3">
                <Button variant="ghost" onClick={() => { setShowCreateModal(false); setErrors({}); }}>
                  取消
                </Button>
                <Button onClick={handleCreateTemplate}>
                  创建模板
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSettings;
