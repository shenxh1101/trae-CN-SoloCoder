'use client';

import { useState } from 'react';
import { articlesAPI } from '../lib/api';

export default function LikeButton({ articleId, initialLikes = 0, initialLiked = false }) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(initialLiked);
  const [loading, setLoading] = useState(false);

  const handleLike = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('请先登录');
      return;
    }

    setLoading(true);
    try {
      const res = await articlesAPI.likeArticle(articleId);
      setLikes(res.data.likes);
      setLiked(res.data.liked);
    } catch (err) {
      console.error('Failed to like article:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={loading}
      className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg transition-all ${liked ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
    >
      <svg
        className={`w-5 h-5 ${liked ? 'fill-current' : ''}`}
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      <span className="text-sm font-medium">{likes}</span>
    </button>
  );
}
