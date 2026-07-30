import { getArticle, isLanguage } from "@/features/articles/data/articles";

export async function GET(
  _request: Request,
  context: { params: Promise<{ lang: string; slug: string }> },
) {
  const { lang, slug } = await context.params;
  const article = isLanguage(lang) ? getArticle(lang, slug) : undefined;

  if (!article) {
    return Response.json({ message: "Article not found" }, { status: 404 });
  }

  return Response.json(article, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
