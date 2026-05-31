import { useEffect, useState } from 'react';
import { Plus, Trash2, HelpCircle, Clock, TrendingUp } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../services/api';
import type { MissedQuestion } from '../types';

export default function MissedQuestionsPage() {
  const [questions, setQuestions] = useState<MissedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMissedId, setSelectedMissedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    keywords: '',
    answer_points: '',
    legal_references: '',
    category: '未分类',
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const response = await adminApi.getMissedQuestions();
      if (response.success) {
        setQuestions(response.data);
      }
    } catch (error) {
      console.error('加载未命中问题失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddFromMissed = (missed: MissedQuestion) => {
    setSelectedMissedId(missed.id);
    setFormData({
      keywords: missed.question,
      answer_points: '',
      legal_references: '',
      category: '未分类',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个记录吗？')) return;
    
    try {
      await adminApi.deleteMissedQuestion(id);
      loadQuestions();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMissedId || !formData.answer_points.trim()) {
      alert('请填写至少一个答案要点');
      return;
    }

    const selectedQuestion = questions.find(q => q.id === selectedMissedId);
    if (!selectedQuestion) return;

    try {
      await adminApi.addFromMissed(selectedMissedId, {
        question: selectedQuestion.question,
        keywords: formData.keywords.split('\n').filter(k => k.trim()),
        answer_points: formData.answer_points.split('\n').filter(a => a.trim()),
        legal_references: formData.legal_references.split('\n').filter(r => r.trim()),
        category: formData.category,
        weight: 1.0,
      });
      
      setShowAddModal(false);
      loadQuestions();
    } catch (error) {
      console.error('添加失败:', error);
      alert('添加失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-primary-900 mb-2">未命中问题</h1>
          <p className="text-gray-500">查看用户询问但系统未能回答的问题，补充到知识库</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                <HelpCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">未命中问题数</p>
                <p className="text-2xl font-bold text-red-600">{questions.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总询问次数</p>
                <p className="text-2xl font-bold text-orange-600">
                  {questions.reduce((sum, q) => sum + q.count, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">平均询问次数</p>
                <p className="text-2xl font-bold text-amber-600">
                  {questions.length > 0 
                    ? (questions.reduce((sum, q) => sum + q.count, 0) / questions.length).toFixed(1)
                    : '0'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          {questions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <HelpCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无未命中问题</p>
              <p className="text-sm mt-1">系统能够回答所有用户问题，做得不错！</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {questions.map((q, index) => (
                <div key={q.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                          index === 0 ? 'bg-red-500' : index === 1 ? 'bg-orange-500' : index === 2 ? 'bg-amber-500' : 'bg-gray-400'
                        }`}>
                          {index + 1}
                        </span>
                        <h3 className="font-medium text-gray-900 text-lg">{q.question}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 ml-11">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4" />
                          被询问 <span className="font-semibold text-orange-600">{q.count}</span> 次
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          最后询问：{new Date(q.last_asked_at).toLocaleString('zh-CN')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddFromMissed(q)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary-800 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
                      >
                        <Plus className="w-4 h-4" />
                        <span>添加到知识库</span>
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900">添加到知识库</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">问题</label>
                  <div className="p-4 bg-gray-50 rounded-xl text-gray-900">
                    {questions.find(q => q.id === selectedMissedId)?.question}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    关键词（每行一个）
                  </label>
                  <textarea
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="关键词1&#10;关键词2"
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    答案要点（每行一个）*
                  </label>
                  <textarea
                    value={formData.answer_points}
                    onChange={(e) => setFormData({ ...formData, answer_points: e.target.value })}
                    placeholder="要点1&#10;要点2"
                    rows={5}
                    className="input-field resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    法律依据（每行一个）
                  </label>
                  <textarea
                    value={formData.legal_references}
                    onChange={(e) => setFormData({ ...formData, legal_references: e.target.value })}
                    placeholder="《劳动合同法》第XX条"
                    rows={3}
                    className="input-field resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">分类</label>
                  <select
                    value={formData.category}
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
                  <Plus className="w-5 h-5" />
                  <span>添加到知识库</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
