'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { articlesAPI } from '../../../lib/api';
import ReadingProgress from '../../../components/ReadingProgress';
import TableOfContents from '../../../components/TableOfContents';
import CommentSection from '../../../components/CommentSection';
import LikeButton from '../../../components/LikeButton';
import FavoriteButton from '../../../components/FavoriteButton';
import ShareButton from '../../../components/ShareButton';
import { calculateReadingTime, formatReadingTime } from '../../../lib/readingTime';
import 'highlight.js/styles/github-dark.css';

export default function ArticleClient({ slug }) {
  const [article, setArticle] = useState(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticle();
  }, [slug]);

  const fetchArticle = async () => {
    setLoading(true);
    try {
      const res = await articlesAPI.getArticle(slug);
      setArticle(res.data.article);
      
      const marked = (await import('marked')).marked;
      const hljs = (await import('highlight.js')).default;
      
      marked.setOptions({
        highlight: function(code, lang) {
          if (lang && hljs.getLanguage(lang)) {
            return hljs.highlight(code, { language: lang }).value;
          }
          return hljs.highlightAuto(code).value;
        },
        breaks: true,
        gfm: true,
      });

      let html = marked(res.data.article.content);
      html = html.replace(/<h([1-6])>([^<]*)<\/h[1-6]>/g, (match, level, text) => {
        const id = text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\-]/g, '');
        return `<h${level} id="${id}">${text}</h${level}>`;
      });
      
      setHtmlContent(html);
    } catch (err) {
      console.error('Failed to fetch article:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">加载中...</p>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">文章不存在</h1>
        <Link href="/" className="mt-4 inline-block text-blue-500 hover:underline">
          返回首页
        </Link>
      </div>
    );
  }

  if (article.visibility === 'private') {
    const isLoggedIn = typeof window !== 'undefined' && localStorage.getItem('token');
    if (!isLoggedIn) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900">该文章为私密文章</h1>
          <p className="mt-2 text-gray-500">请登录后查看</p>
          <Link href="/login" className="mt-4 inline-block px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            去登录
          </Link>
        </div>
      );
    }
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <>
      <ReadingProgress />
      <article className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1">
            <header className="mb-8">
              <div className="flex flex-wrap gap-2 mb-4">
                {article.visibility === 'private' && (
                  <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                    🔒 私密
                  </span>
                )}
                {article.tags?.map((tag) => (
                  <Link
                    key={tag._id}
                    href={`/tags/${tag.slug}`}
                    className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                {article.title}
              </h1>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span>{article.author?.username}</span>
                <span>·</span>
                <span>{formatDate(article.createdAt)}</span>
                <span>·</span>
                <span>{formatReadingTime(calculateReadingTime(article.content))}</span>
                <span>·</span>
                <span>{article.views} 阅读</span>
              </div>
            </header>

            {article.coverImage && (
              <div className="mb-8 rounded-lg overflow-hidden">
                <img
                  src={`${process.env.API_URL?.replace('/api', '')}${article.coverImage}`}
                  alt={article.title}
                  className="w-full h-auto"
                />
              </div>
            )}

            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />

            <div className="mt-8 pt-8 border-t border-gray-100">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <LikeButton
                    articleId={article._id}
                    initialLikes={article.likes}
                  />
                  <FavoriteButton
                    articleId={article._id}
                    initialFavorites={article.favorites}
                  />
                  <ShareButton
                    title={article.title}
                    url={typeof window !== 'undefined' ? window.location.href : ''}
                  />
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {article.views} 阅读
                  </span>
                </div>
              </div>
            </div>

            <CommentSection articleId={article._id} />
          </div>

          <aside className="lg:w-64 hidden lg:block">
            <TableOfContents content={htmlContent} />
          </aside>
        </div>
      </article>
    </>
  );
}
