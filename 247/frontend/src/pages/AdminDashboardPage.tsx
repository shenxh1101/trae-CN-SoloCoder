import { useEffect, useState } from 'react';
import { MessageSquare, BookOpen, ThumbsUp, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../services/api';
import type { AdminStats } from '../types';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await adminApi.getStats();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('加载统计数据失败:', error);
    } finally {
      setIsLoading(false);
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

  const statCards = stats ? [
    {
      label: '总对话数',
      value: stats.total_conversations,
      icon: MessageSquare,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      label: '总消息数',
      value: stats.total_messages,
      icon: Users,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
    },
    {
      label: '知识库条目',
      value: stats.total_knowledge_entries,
      icon: BookOpen,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      label: '总投票数',
      value: stats.total_votes,
      icon: ThumbsUp,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
    },
    {
      label: '回答有帮助率',
      value: `${(stats.helpful_rate * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
    },
    {
      label: '知识库匹配率',
      value: `${(stats.match_rate * 100).toFixed(1)}%`,
      icon: AlertTriangle,
      color: 'bg-red-500',
      bgColor: 'bg-red-50',
    },
  ] : [];

  return (
    <AdminLayout>
      <div>
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-bold text-primary-900 mb-2">数据概览</h1>
          <p className="text-gray-500">查看系统运行情况和用户使用数据</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <div key={index} className="card p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">{card.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{card.value}</p>
                  </div>
                  <div className={`${card.bgColor} p-3 rounded-xl`}>
                    <Icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">未命中问题统计</h3>
            {stats && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <div>
                    <p className="text-sm text-gray-500">未命中问题总数</p>
                    <p className="text-2xl font-bold text-red-600">
                      {stats.missed_questions.total_unique_questions}
                    </p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-red-400" />
                </div>
                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl">
                  <div>
                    <p className="text-sm text-gray-500">总询问次数</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {stats.missed_questions.total_ask_count}
                    </p>
                  </div>
                  <MessageSquare className="w-10 h-10 text-orange-400" />
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">
                    💡 <strong>提示：</strong>未命中问题是用户询问但知识库中没有匹配答案的问题。
                    请定期查看并补充这些问题到知识库中，以提升系统回答能力。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h3>
            <div className="space-y-3">
              <button
                onClick={() => window.location.href = '/admin/missed'}
                className="w-full flex items-center justify-between p-4 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-primary-900">查看未命中问题</p>
                    <p className="text-sm text-primary-600">处理用户未得到答案的问题</p>
                  </div>
                </div>
                <span className="text-primary-400">→</span>
              </button>

              <button
                onClick={() => window.location.href = '/admin/knowledge'}
                className="w-full flex items-center justify-between p-4 bg-gold-50 hover:bg-gold-100 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-gold-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gold-900">管理知识库</p>
                    <p className="text-sm text-gold-600">添加、编辑或删除法律知识条目</p>
                  </div>
                </div>
                <span className="text-gold-400">→</span>
              </button>

              <button
                onClick={async () => {
                  if (confirm('确定要立即创建知识库备份吗？')) {
                    try {
                      await adminApi.createBackup();
                      alert('备份创建成功！');
                    } catch (error) {
                      alert('备份创建失败');
                    }
                  }
                }}
                className="w-full flex items-center justify-between p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-green-900">立即备份</p>
                    <p className="text-sm text-green-600">创建知识库的手动备份</p>
                  </div>
                </div>
                <span className="text-green-400">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
