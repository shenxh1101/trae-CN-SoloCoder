import ArticleClient from './ArticleClient';

export async function generateStaticParams() {
  try {
    const res = await fetch(`${process.env.API_URL}/articles?limit=100`, {
      next: { revalidate: 60 },
    });
    const data = await res.json();
    return (data.articles || []).map((article) => ({
      slug: article.slug,
    }));
  } catch (error) {
    return [];
  }
}

export const revalidate = 60;

export default function ArticlePage({ params }) {
  return <ArticleClient slug={params.slug} />;
}
