import Link from 'next/link';
import { calculateReadingTime, formatReadingTime } from '../lib/readingTime';

export default function ArticleCard({ article }) {
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const readingTime = calculateReadingTime(article.content);

  return (
    <article className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
      {article.coverImage && (
        <div className="aspect-video bg-gray-100 overflow-hidden">
          <img
            src={`${process.env.API_URL?.replace('/api', '')}${article.coverImage}`}
            alt={article.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-6">
        <div className="flex flex-wrap gap-2 mb-3">
          {article.tags?.map((tag) => (
            <Link
              key={tag._id}
              href={`/tags/${tag.slug}`}
              className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition"
            >
              #{tag.name}
            </Link>
          ))}
        </div>
        <Link href={`/articles/${article.slug}`}>
          <h2 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-600 transition">
            {article.title}
          </h2>
        </Link>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {article.excerpt}
        </p>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{formatDate(article.createdAt)}</span>
          <div className="flex items-center space-x-4">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatReadingTime(readingTime)}
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {article.views}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
