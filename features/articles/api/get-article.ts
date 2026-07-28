import type { Article, ArticleSummary } from "../types/article";

export async function getArticle(slug: string): Promise<Article> {
  const response = await fetch(`/api/articles/${slug}`);

  if (!response.ok) {
    throw new Error("We could not load this article.");
  }

  return response.json() as Promise<Article>;
}

export async function getArticles(): Promise<ArticleSummary[]> {
  const response = await fetch("/api/articles");

  if (!response.ok) {
    throw new Error("We could not load the journal.");
  }

  return response.json() as Promise<ArticleSummary[]>;
}
