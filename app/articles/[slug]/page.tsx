import type { Metadata } from "next";
import { ArticlePage } from "@/features/articles/components/article-page";
import { articles } from "@/features/articles/data/articles";

type ArticleDetailProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: ArticleDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const article = articles[slug];

  if (!article) {
    return {
      title: "Article not found | The Local Edit",
    };
  }

  return {
    title: `${article.title} | The Local Edit`,
    description: article.deck,
  };
}

export default async function ArticleDetail({ params }: ArticleDetailProps) {
  const { slug } = await params;

  return <ArticlePage slug={slug} />;
}
