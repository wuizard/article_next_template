import {
  absoluteUrl,
  articlePath,
  getArticles,
  getLanguage,
  isLanguage,
  langPath,
  languageCodes,
  site,
} from "@/features/articles/data/articles";
import { escapeXml } from "@/features/articles/seo/xml";

export function generateStaticParams() {
  return languageCodes.map((lang) => ({ lang }));
}

/** One RSS feed per language — mixing languages in a feed helps no one. */
export async function GET(
  _request: Request,
  context: { params: Promise<{ lang: string }> },
) {
  const { lang } = await context.params;
  if (!isLanguage(lang)) {
    return new Response("Not found", { status: 404 });
  }

  const language = getLanguage(lang);
  const items = getArticles(lang).slice(0, 50);
  const updated = items[0]?.updatedAt ?? site.generatedAt;
  const feedUrl = absoluteUrl(langPath(lang, "/feed.xml"));

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}${language.tagline ? ` ${escapeXml(language.tagline)}` : ""}</title>
    <link>${escapeXml(absoluteUrl(langPath(lang)))}</link>
    <description>${escapeXml(language.description)}</description>
    <language>${escapeXml(lang)}</language>
    <lastBuildDate>${new Date(updated).toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
${items
  .map((article) => {
    const url = absoluteUrl(articlePath(lang, article.slug));
    return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <pubDate>${new Date(article.publishedAt).toUTCString()}</pubDate>
      <category>${escapeXml(article.category)}</category>
      <description>${escapeXml(article.seo.metaDescription || article.deck)}</description>
    </item>`;
  })
  .join("\n")}
  </channel>
</rss>
`;

  return new Response(body, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=3600",
    },
  });
}
