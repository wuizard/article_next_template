import { articles } from "@/features/articles/data/articles";

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const article = articles[slug];

  if (!article) {
    return Response.json({ message: "Article not found" }, { status: 404 });
  }

  return Response.json(article, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=3600",
    },
  });
}
