'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { articlesAPI, tagsAPI } from '../../lib/api';

export default function AdminPage() {
  const router = useRouter();
  const [articles, setArticles] = useState([]);
  const [tags, setTags] = useState([]);
  const [activeTab, setActiveTab] = useState('articles');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      const [articlesRes, tagsRes] = await Promise.all([
        articlesAPI.getAllArticles(),
        tagsAPI.getTags(),
      ]);
      setArticles(articlesRes.data);
      setTags(tagsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = async (id) => {
    if (!confirm('确定要删除这篇文章吗？')) return;
    try {
      await articlesAPI.deleteArticle(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete article:', err);
    }
  };

  const handleDeleteTag = async (id) => {
    if (!confirm('确定要删除这个标签吗？')) return;
    try {
      await tagsAPI.deleteTag(id);
      fetchData();
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">后台管理</h1>
        <div className="flex gap-4">
          <Link
            href="/admin/articles/new"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            新建文章
          </Link>
          <Link
            href="/admin/tags/new"
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
          >
            新建标签
          </Link>
        </div>
      </div>

      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('articles')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'articles' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            文章 ({articles.length})
          </button>
          <button
            onClick={() => setActiveTab('tags')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'tags' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            标签 ({tags.length})
          </button>
        </nav>
      </div>

      {activeTab === 'articles' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">可见性</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">浏览量</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {articles.map((article) => (
                <tr key={article._id}>
                  <td className="px-6 py-4">
                    <Link href={`/articles/${article.slug}`} className="text-gray-900 hover:text-blue-600">
                      {article.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${article.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {article.status === 'published' ? '已发布' : '草稿'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${article.visibility === 'public' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {article.visibility === 'public' ? '公开' : '私密'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{article.views}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(article.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <Link
                      href={`/admin/articles/edit/${article._id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => handleDeleteArticle(article._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'tags' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">标签名</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">描述</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">文章数</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tags.map((tag) => (
                <tr key={tag._id}>
                  <td className="px-6 py-4 text-gray-900">{tag.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{tag.description || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{tag.count}</td>
                  <td className="px-6 py-4 text-right text-sm font-medium">
                    <Link
                      href={`/admin/tags/edit/${tag._id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      编辑
                    </Link>
                    <button
                      onClick={() => handleDeleteTag(tag._id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
