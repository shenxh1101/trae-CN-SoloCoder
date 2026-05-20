'use client';

import { useState, useEffect } from 'react';
import { articlesAPI, tagsAPI } from '../lib/api';
import ArticleCard from '../components/ArticleCard';
import TagCloud from '../components/TagCloud';

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [page, search, selectedTag]);

  useEffect(() => {
    tagsAPI.getTags().then((res) => setTags(res.data));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 6 };
      if (search) params.search = search;
      if (selectedTag) params.tag = selectedTag;
      const res = await articlesAPI.getArticles(params);
      setArticles(res.data.articles);
      setTotalPages(res.data.totalPages);
    } catch (err) {
      console.error('Failed to fetch articles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchData();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">欢迎来到我的博客</h1>
        <p className="text-gray-600 text-lg">分享技术、生活与思考</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <form onSubmit={handleSearch} className="mb-8">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="搜索文章..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                搜索
              </button>
            </div>
          </form>

          {selectedTag && (
            <div className="mb-6 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
              <span className="text-blue-600">
                正在查看标签: {tags.find((t) => t._id === selectedTag)?.name}
              </span>
              <button
                onClick={() => {
                  setSelectedTag('');
                  setPage(1);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                清除
              </button>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-500">加载中...</p>
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              暂无文章
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {articles.map((article) => (
                  <ArticleCard key={article._id} article={article} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    上一页
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`px-4 py-2 rounded-lg ${page === p ? 'bg-blue-500 text-white' : 'border border-gray-300 hover:bg-gray-50'}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <aside className="lg:w-80">
          <TagCloud tags={tags} />
        </aside>
      </div>
    </div>
  );
}
