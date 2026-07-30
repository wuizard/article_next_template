import {
  absoluteUrl,
  articlePath,
  getArticles,
  langPath,
  languageCodes,
  site,
} from "@/features/articles/data/articles";
import { escapeXml } from "@/features/articles/seo/xml";

type Entry = {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
  /** hreflang alternates, emitted as xhtml:link rel="alternate". */
  alternates: { lang: string; href: string }[];
};

/**
 * One sitemap for every language. Archive pages cross-link via hreflang;
 * articles do not, because a translated article has its own slug and no
 * guaranteed counterpart.
 */
export async function GET() {
  const archiveAlternates = languageCodes.map((code) => ({
    lang: code,
    href: absoluteUrl(langPath(code)),
  }));
  archiveAlternates.push({
    lang: "x-default",
    href: absoluteUrl(langPath(site.defaultLanguage)),
  });

  const entries: Entry[] = [];

  for (const lang of languageCodes) {
    const articles = getArticles(lang);
    entries.push({
      loc: absoluteUrl(langPath(lang)),
      lastmod: articles[0]?.updatedAt ?? site.generatedAt,
      changefreq: "daily",
      priority: lang === site.defaultLanguage ? "1.0" : "0.9",
      alternates: archiveAlternates,
    });

    for (const article of articles) {
      entries.push({
        loc: absoluteUrl(articlePath(lang, article.slug)),
        lastmod: article.updatedAt,
        changefreq: "monthly",
        priority: "0.8",
        alternates: [],
      });
    }
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries
  .map(
    (entry) => `  <url>
    <loc>${escapeXml(entry.loc)}</loc>
    <lastmod>${new Date(entry.lastmod).toISOString()}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>${entry.alternates
      .map(
        (alternate) =>
          `\n    <xhtml:link rel="alternate" hreflang="${escapeXml(alternate.lang)}" href="${escapeXml(alternate.href)}" />`,
      )
      .join("")}
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=600, s-maxage=3600",
    },
  });
}
