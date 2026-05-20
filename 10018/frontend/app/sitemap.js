import { articlesAPI, tagsAPI } from '../lib/api';

export default async function sitemap() {
  const baseUrl = process.env.SITE_URL || 'http://localhost:3000';

  const staticRoutes = [
    '',
    '/archive',
    '/tags',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'weekly',
    priority: 1,
  }));

  try {
    const [articlesRes, tagsRes] = await Promise.all([
      fetch(`${process.env.API_URL}/articles`).then((res) => res.json()),
      fetch(`${process.env.API_URL}/tags`).then((res) => res.json()),
    ]);

    const articleRoutes = (articlesRes.articles || []).map((article) => ({
      url: `${baseUrl}/articles/${article.slug}`,
      lastModified: new Date(article.updatedAt).toISOString(),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    const tagRoutes = (tagsRes || []).map((tag) => ({
      url: `${baseUrl}/tags/${tag.slug}`,
      lastModified: new Date().toISOString(),
      changeFrequency: 'weekly',
      priority: 0.6,
    }));

    return [...staticRoutes, ...articleRoutes, ...tagRoutes];
  } catch (error) {
    return staticRoutes;
  }
}
