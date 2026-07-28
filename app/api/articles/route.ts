import { articles } from "@/features/articles/data/articles";
import type { ArticleSummary } from "@/features/articles/types/article";

export async function GET() {
  const summaries: ArticleSummary[] = Object.values(articles).map((article) => ({
    slug: article.slug,
    category: article.category,
    title: article.title,
    deck: article.deck,
    heroImage: article.heroImage,
    publishedAt: article.publishedAt,
    readTime: article.readTime,
  }));

  return Response.json(summaries, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
