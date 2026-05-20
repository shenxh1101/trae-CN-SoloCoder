'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { articlesAPI, tagsAPI, uploadAPI } from '../../../../../lib/api';

export default function EditArticlePage() {
  const router = useRouter();
  const params = useParams();
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    coverImage: '',
    tags: [],
    status: 'draft',
    visibility: 'public',
  });
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, params.id]);

  const fetchData = async () => {
    try {
      const [articleRes, tagsRes] = await Promise.all([
        articlesAPI.getAllArticles().then(res => res.data.find(a => a._id === params.id)),
        tagsAPI.getTags(),
      ]);
      
      if (articleRes) {
        setFormData({
          title: articleRes.title,
          content: articleRes.content,
          excerpt: articleRes.excerpt || '',
          coverImage: articleRes.coverImage || '',
          tags: articleRes.tags.map(t => t._id),
          status: articleRes.status,
          visibility: articleRes.visibility || 'public',
        });
      }
      setTags(tagsRes.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await articlesAPI.updateArticle(params.id, formData);
      router.push('/admin');
    } catch (err) {
      console.error('Failed to update article:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await uploadAPI.uploadImage(formData);
      setFormData({ ...formData, coverImage: res.data.url });
    } catch (err) {
      console.error('Failed to upload image:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleTagToggle = (tagId) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter((t) => t !== tagId)
        : [...prev.tags, tagId],
    }));
  };

  const insertImageMarkdown = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await uploadAPI.uploadImage(formData);
        const imageMarkdown = `\n![image](${process.env.API_URL?.replace('/api', '')}${res.data.url})\n`;
        setFormData((prev) => ({
          ...prev,
          content: prev.content + imageMarkdown,
        }));
      } catch (err) {
        console.error('Failed to upload image:', err);
      } finally {
        setUploading(false);
      }
    };
    input.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">编辑文章</h1>
        <Link href="/admin" className="text-gray-500 hover:text-gray-700">
          返回
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标题
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            封面图片
          </label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {formData.coverImage && (
              <div className="relative w-32 h-20">
                <img
                  src={`${process.env.API_URL?.replace('/api', '')}${formData.coverImage}`}
                  alt="cover"
                  className="w-full h-full object-cover rounded"
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, coverImage: '' })}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs"
                >
                  ×
                </button>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            摘要
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
            rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            标签
          </label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <label
                key={tag._id}
                className={`px-3 py-1 rounded-full cursor-pointer text-sm ${formData.tags.includes(tag._id) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                <input
                  type="checkbox"
                  checked={formData.tags.includes(tag._id)}
                  onChange={() => handleTagToggle(tag._id)}
                  className="hidden"
                />
                {tag.name}
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              内容 (Markdown)
            </label>
            <button
              type="button"
              onClick={insertImageMarkdown}
              disabled={uploading}
              className="text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50"
            >
              {uploading ? '上传中...' : '插入图片'}
            </button>
          </div>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={20}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            可见性
          </label>
          <select
            value={formData.visibility}
            onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="public">公开</option>
            <option value="private">私密（仅登录可见）</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            状态
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="draft">草稿</option>
            <option value="published">发布</option>
          </select>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}
