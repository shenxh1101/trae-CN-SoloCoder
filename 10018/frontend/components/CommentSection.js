'use client';

import { useState, useEffect } from 'react';
import { commentsAPI } from '../lib/api';

export default function CommentSection({ articleId }) {
  const [comments, setComments] = useState([]);
  const [formData, setFormData] = useState({
    author: '',
    email: '',
    website: '',
    content: '',
    parent: null,
  });
  const [loading, setLoading] = useState(false);
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    fetchComments();
  }, [articleId]);

  const fetchComments = async () => {
    try {
      const res = await commentsAPI.getComments(articleId);
      setComments(res.data);
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await commentsAPI.createComment(articleId, formData);
      setFormData({ author: '', email: '', website: '', content: '', parent: null });
      setReplyTo(null);
      fetchComments();
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (comment) => {
    setReplyTo(comment);
    setFormData({ ...formData, parent: comment._id });
  };

  const renderComments = (comments, parentId = null, level = 0) => {
    return comments
      .filter((c) => c.parent === parentId)
      .map((comment) => (
        <div key={comment._id} className={`${level > 0 ? 'ml-8 mt-4' : 'mt-6'}`}>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">{comment.author}</span>
                {comment.website && (
                  <a
                    href={comment.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline"
                  >
                    网站
                  </a>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleString('zh-CN')}
              </span>
            </div>
            <p className="text-gray-700">{comment.content}</p>
            <button
              onClick={() => handleReply(comment)}
              className="text-sm text-blue-500 hover:text-blue-600 mt-2"
            >
              回复
            </button>
          </div>
          {renderComments(comments, comment._id, level + 1)}
        </div>
      ));
  };

  return (
    <div className="mt-12">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">
        评论 ({comments.length})
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4 mb-8">
        {replyTo && (
          <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
            <span className="text-sm text-blue-600">
              正在回复 @{replyTo.author}
            </span>
            <button
              type="button"
              onClick={() => {
                setReplyTo(null);
                setFormData({ ...formData, parent: null });
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="昵称 *"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          <input
            type="email"
            placeholder="邮箱（选填，用于回复通知）"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <input
            type="url"
            placeholder="网站（选填）"
            value={formData.website}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <textarea
          placeholder="写下你的评论..."
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
        >
          {loading ? '发送中...' : '发表评论'}
        </button>
      </form>

      <div>{renderComments(comments)}</div>
    </div>
  );
}
