'use client';

import { useState } from 'react';
import { articlesAPI } from '../lib/api';

export default function FavoriteButton({ articleId, initialFavorites = 0, initialFavorited = false }) {
  const [favorites, setFavorites] = useState(initialFavorites);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  const handleFavorite = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('请先登录');
      return;
    }

    setLoading(true);
    try {
      const res = await articlesAPI.favoriteArticle(articleId);
      setFavorites(res.data.favorites);
      setFavorited(res.data.favorited);
    } catch (err) {
      console.error('Failed to favorite article:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFavorite}
      disabled={loading}
      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${favorited ? 'bg-yellow-50 text-yellow-500' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
    >
      <svg
        className={`w-5 h-5 ${favorited ? 'fill-current' : ''}`}
        fill={favorited ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118L12 17.347l-3.767 2.768c-.783.57-1.838-.196-1.539-1.118l1.518-4.674a1 1 0 00-.364-1.118L3.588 10.11c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.95-.69l1.519-4.674z"
        />
      </svg>
      <span className="text-sm font-medium">{favorites}</span>
    </button>
  );
}
