'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { tagsAPI, articlesAPI } from '../../../lib/api';
import ArticleCard from '../../../components/ArticleCard';

export default function TagDetailPage() {
  const params = useParams();
  const [tag, setTag] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [params.slug]);

  const fetchData = async () => {
    try {
      const tagsRes = await tagsAPI.getTags();
      const foundTag = tagsRes.data.find((t) => t.slug === params.slug);
      setTag(foundTag);

      if (foundTag) {
        const articlesRes = await articlesAPI.getArticles({ tag: foundTag._id });
        setArticles(articlesRes.data.articles);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  if (!tag) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">标签不存在</h1>
        <Link href="/tags" className="mt-4 inline-block text-blue-500 hover:underline">
          返回标签列表
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          #{tag.name}
        </h1>
        {tag.description && (
          <p className="text-gray-600">{tag.description}</p>
        )}
        <p className="text-sm text-gray-500 mt-2">
          共 {articles.length} 篇文章
        </p>
      </div>

      {articles.length === 0 ? (
        <p className="text-gray-500 text-center py-12">该标签下暂无文章</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article._id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}
