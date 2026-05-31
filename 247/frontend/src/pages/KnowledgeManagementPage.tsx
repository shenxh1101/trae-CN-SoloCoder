import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, BookOpen } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../services/api';
import type { KnowledgeEntry } from '../types';

export default function KnowledgeManagementPage() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<KnowledgeEntry>>({
    question: '',
    keywords: [],
    answer_points: [],
    legal_references: [],
    category: '未分类',
    weight: 1.0,
  });

  useEffect(() => {
    loadEntries();
  }, [searchKeyword]);

  const loadEntries = async () => {
    try {
      const response = await adminApi.getKnowledgeEntries(searchKeyword || undefined);
      if (response.success) {
        setEntries(response.data);
      }
    } catch (error) {
      console.error('加载知识库失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({
      question: '',
      keywords: [],
      answer_points: [],
      legal_references: [],
      category: '未分类',
      weight: 1.0,
    });
    setEditingId(null);
    setShowAddModal(true);
  };

  const handleEdit = (entry: KnowledgeEntry) => {
    setFormData({ ...entry });
    setEditingId(entry.id);
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个条目吗？')) return;
    
    try {
      await adminApi.deleteKnowledgeEntry(id);
      loadEntries();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.question || !formData.answer_points?.length) {
      alert('请填写问题和至少一个答案要点');
      return;
    }

    try {
      if (editingId) {
        await adminApi.updateKnowledgeEntry(editingId, formData);
      } else {
        await adminApi.addKnowledgeEntry(formData);
      }
      setShowAddModal(false);
      loadEntries();
    } catch (error) {
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    }
  };

  const handleArrayInput = (field: 'keywords' | 'answer_points' | 'legal_references', value: string) => {
    const items = value.split('\n').filter(item => item.trim());
    setFormData({ ...formData, [field]: items });
  };

  const getArrayString = (field: 'keywords' | 'answer_points' | 'legal_references') => {
    return (formData[field] || []).join('\n');
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-primary-900 mb-2">知识库管理</h1>
            <p className="text-gray-500">管理法律知识条目，优化系统回答质量</p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-800 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>添加条目</span>
          </button>
        </div>

        <div className="card mb-6">
          <div className="p-4 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索问题、关键词或分类..."
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>暂无知识库条目</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">问题</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">分类</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">权重</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">有帮助</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">无帮助</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="max-w-md">
                          <p className="font-medium text-gray-900 truncate">{entry.question}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.keywords.slice(0, 3).map((kw, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 bg-primary-100 text-primary-700 rounded">
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-sm">
                          {entry.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`font-mono ${entry.weight >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.weight.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-green-600 font-medium">
                        {entry.helpful_count}
                      </td>
                      <td className="px-6 py-4 text-center text-red-600 font-medium">
                        {entry.not_helpful_count}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingId ? '编辑条目' : '添加条目'}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">问题 *</label>
                  <input
                    type="text"
                    value={formData.question || ''}
                    onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                    placeholder="例如：试用期被辞退有赔偿吗？"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    关键词（每行一个）
                  </label>
                  <textarea
                    value={getArrayString('keywords')}
                    onChange={(e) => handleArrayInput('keywords', e.target.value)}
                    placeholder="试用期&#10;辞退&#10;赔偿"
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    答案要点（每行一个）*
                  </label>
                  <textarea
                    value={getArrayString('answer_points')}
                    onChange={(e) => handleArrayInput('answer_points', e.target.value)}
                    placeholder="1. 试用期内...&#10;2. 如果用人单位违法..."
                    rows={5}
                    className="input-field resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    法律依据（每行一个）
                  </label>
                  <textarea
                    value={getArrayString('legal_references')}
                    onChange={(e) => handleArrayInput('legal_references', e.target.value)}
                    placeholder="《中华人民共和国劳动合同法》第39条&#10;《中华人民共和国劳动合同法》第47条"
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                    <select
                      value={formData.category || '未分类'}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input-field"
                    >
                      <option value="劳动合同">劳动合同</option>
                      <option value="工资福利">工资福利</option>
                      <option value="社会保险">社会保险</option>
                      <option value="休息休假">休息休假</option>
                      <option value="劳动争议">劳动争议</option>
                      <option value="工伤赔偿">工伤赔偿</option>
                      <option value="未分类">未分类</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      权重 (0.5 - 2.0)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="2.0"
                      value={formData.weight || 1.0}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-100 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary-800 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  <span>{editingId ? '保存修改' : '添加条目'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
