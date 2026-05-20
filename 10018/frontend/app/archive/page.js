'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { articlesAPI } from '../../lib/api';

export default function ArchivePage() {
  const [archive, setArchive] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchive();
  }, []);

  const fetchArchive = async () => {
    try {
      const res = await articlesAPI.getArchive();
      setArchive(res.data);
    } catch (err) {
      console.error('Failed to fetch archive:', err);
    } finally {
      setLoading(false);
    }
  };

  const sortedMonths = Object.keys(archive).sort().reverse();

  const formatMonth = (monthKey) => {
    const [year, month] = monthKey.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">文章归档</h1>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      ) : sortedMonths.length === 0 ? (
        <p className="text-gray-500 text-center py-12">暂无文章</p>
      ) : (
        <div className="space-y-8">
          {sortedMonths.map((monthKey) => (
            <div key={monthKey}>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                {formatMonth(monthKey)}
                <span className="ml-2 text-sm text-gray-500 font-normal">
                  ({archive[monthKey].length}篇)
                </span>
              </h2>
              <div className="border-l-2 border-gray-200 ml-1 pl-6 space-y-3">
                {archive[monthKey].map((article) => (
                  <Link
                    key={article._id}
                    href={`/articles/${article.slug}`}
                    className="block group"
                  >
                    <div className="flex items-center">
                      <span className="w-2 h-2 bg-gray-300 group-hover:bg-blue-500 rounded-full -ml-[25px] mr-4"></span>
                      <span className="text-sm text-gray-500 w-20 flex-shrink-0">
                        {new Date(article.createdAt).getDate()}日
                      </span>
                      <span className="text-gray-700 group-hover:text-blue-600 transition">
                        {article.title}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
