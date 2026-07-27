import type { Article } from "../types/article";

export async function getArticle(slug: string): Promise<Article> {
  const response = await fetch(`/api/articles/${slug}`);

  if (!response.ok) {
    throw new Error("We could not load this article.");
  }

  return response.json() as Promise<Article>;
}
