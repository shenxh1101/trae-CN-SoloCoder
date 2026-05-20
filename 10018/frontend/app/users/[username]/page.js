'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { usersAPI } from '../../../lib/api';
import ArticleCard from '../../../components/ArticleCard';

export default function UserProfilePage() {
  const params = useParams();
  const [user, setUser] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserProfile();
  }, [params.username]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getUserProfile(params.username);
      setUser(res.data.user);
      setArticles(res.data.articles);
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">用户不存在</h1>
        <Link href="/" className="mt-4 inline-block text-blue-500 hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-8 mb-8">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center text-4xl">
            {user.avatar ? (
              <img
                src={`${process.env.API_URL?.replace('/api', '')}${user.avatar}`}
                alt={user.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span>{user.username?.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{user.username}</h1>
            {user.bio && (
              <p className="mt-2 text-gray-600">{user.bio}</p>
            )}
            <div className="mt-4 flex items-center gap-6 text-sm text-gray-500">
              <span>{articles.length} 篇文章</span>
              <span>注册于 {new Date(user.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">发布的文章</h2>
        {articles.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无文章</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((article) => (
              <ArticleCard key={article._id} article={article} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
