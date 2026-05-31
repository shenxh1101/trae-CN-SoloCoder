import { useEffect, useState } from 'react';
import { Database, Download, Upload, Trash2, RefreshCw, Clock, FileJson } from 'lucide-react';
import AdminLayout from '../components/AdminLayout';
import { adminApi } from '../services/api';
import type { BackupFile } from '../types';

const API_BASE = 'http://localhost:5001/api';

export default function BackupManagementPage() {
  const [backups, setBackups] = useState<BackupFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadBackups();
  }, []);

  const loadBackups = async () => {
    try {
      const response = await adminApi.getBackups();
      if (response.success) {
        setBackups(response.data);
      }
    } catch (error) {
      console.error('加载备份列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (isCreating) return;
    setIsCreating(true);
    
    try {
      await adminApi.createBackup();
      await loadBackups();
    } catch (error) {
      console.error('创建备份失败:', error);
      alert('创建备份失败');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (filename: string) => {
    if (!confirm('确定要恢复这个备份吗？这将覆盖当前的知识库数据。')) return;
    
    try {
      await adminApi.restoreBackup(filename);
      alert('备份恢复成功！');
      loadBackups();
    } catch (error) {
      console.error('恢复备份失败:', error);
      alert('恢复备份失败');
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm('确定要删除这个备份吗？')) return;
    
    try {
      await adminApi.deleteBackup(filename);
      loadBackups();
    } catch (error) {
      console.error('删除备份失败:', error);
      alert('删除备份失败');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN');
  };

  return (
    <AdminLayout>
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-primary-900 mb-2">备份管理</h1>
            <p className="text-gray-500">管理知识库的备份文件，防止数据丢失</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadBackups}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
              <span>刷新</span>
            </button>
            <button
              onClick={handleCreateBackup}
              disabled={isCreating}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-800 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:bg-gray-400"
            >
              {isCreating ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Database className="w-5 h-5" />
              )}
              <span>{isCreating ? '创建中...' : '创建备份'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Database className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">备份总数</p>
                <p className="text-2xl font-bold text-blue-600">{backups.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">最新备份</p>
                <p className="text-lg font-bold text-green-600">
                  {backups[0] ? formatDate(backups[0].created_at) : '-'}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <FileJson className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">总大小</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatSize(backups.reduce((sum, b) => sum + b.size_bytes, 0))}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary-800 border-t-transparent rounded-full" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>暂无备份文件</p>
              <p className="text-sm mt-1">点击上方按钮创建第一个备份</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">文件名</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">大小</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">创建时间</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {backups.map((backup, index) => (
                    <tr key={backup.filename} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            index === 0 ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <FileJson className={`w-5 h-5 ${index === 0 ? 'text-green-600' : 'text-gray-600'}`} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{backup.filename}</p>
                            {index === 0 && (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                                最新
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatSize(backup.size_bytes)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDate(backup.created_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleRestore(backup.filename)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="恢复备份"
                          >
                            <Upload className="w-4 h-4" />
                            <span>恢复</span>
                          </button>
                          <button
                            onClick={() => {
                              const token = localStorage.getItem('admin_token');
                              const url = `${API_BASE}/admin/backups/${backup.filename}?token=${token}`;
                              window.open(url, '_blank');
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="下载备份"
                          >
                            <Download className="w-4 h-4" />
                            <span>下载</span>
                          </button>
                          <button
                            onClick={() => handleDelete(backup.filename)}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除备份"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span>删除</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-xl">
          <h3 className="font-semibold text-blue-900 mb-2">💡 关于自动备份</h3>
          <p className="text-sm text-blue-800">
            系统会每 24 小时自动创建一次知识库备份，并保留最近 10 个备份文件。
            您也可以随时点击上方按钮手动创建备份。建议在对知识库进行重大修改前先创建备份。
          </p>
        </div>
      </div>
    </AdminLayout>
  );
}
