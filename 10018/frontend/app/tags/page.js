'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { tagsAPI } from '../../lib/api';

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const res = await tagsAPI.getTags();
      setTags(res.data);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxCount = Math.max(...tags.map((t) => t.count), 1);

  const getSize = (count) => {
    const ratio = count / maxCount;
    if (ratio < 0.33) return 'text-lg';
    if (ratio < 0.66) return 'text-2xl';
    return 'text-3xl';
  };

  const getColor = (count) => {
    const ratio = count / maxCount;
    if (ratio < 0.33) return 'text-gray-600';
    if (ratio < 0.66) return 'text-blue-500';
    return 'text-purple-500';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">所有标签</h1>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : tags.length === 0 ? (
        <p className="text-gray-500 text-center py-12">暂无标签</p>
      ) : (
        <div className="flex flex-wrap gap-6 justify-center">
          {tags.map((tag) => (
            <Link
              key={tag._id}
              href={`/tags/${tag.slug}`}
              className={`${getSize(tag.count)} ${getColor(tag.count)} hover:text-blue-600 transition-all hover:scale-110`}
            >
              #{tag.name}
              <span className="text-xs text-gray-400 ml-1">({tag.count})</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
