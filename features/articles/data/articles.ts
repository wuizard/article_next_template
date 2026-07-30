import { articlesByLanguage, siteConfig } from "@/content/manifest";
import type { Article, ArticleSummary } from "../types/article";
import type { SiteConfig, SiteLanguage } from "../types/site";

export const site: SiteConfig = siteConfig;
export const languages: SiteLanguage[] = site.languages;
export const languageCodes: string[] = languages.map((entry) => entry.code);
export const defaultLanguage: string = site.defaultLanguage;

export function isLanguage(code: string): boolean {
  return languageCodes.includes(code);
}

/** Falls back to the default language rather than throwing. */
export function getLanguage(code: string): SiteLanguage {
  return (
    languages.find((entry) => entry.code === code) ??
    languages.find((entry) => entry.code === defaultLanguage) ??
    languages[0]
  );
}

/** Published articles for one language, newest first. */
export function getArticles(lang: string): Article[] {
  return articlesByLanguage[lang] ?? [];
}

/** Every published article across every language — used by the sitemap. */
export function getAllArticles(): Article[] {
  return languageCodes.flatMap((code) => getArticles(code));
}

export function getArticle(lang: string, slug: string): Article | undefined {
  return getArticles(lang).find((article) => article.slug === slug);
}

export function toSummary(article: Article): ArticleSummary {
  return {
    slug: article.slug,
    lang: article.lang,
    category: article.category,
    title: article.title,
    deck: article.deck,
    heroImage: article.heroImage,
    heroImageAlt: article.heroImageAlt,
    publishedAt: article.publishedAt,
    updatedAt: article.updatedAt,
    readTime: article.readTime,
  };
}

export function getSummaries(lang: string): ArticleSummary[] {
  return getArticles(lang).map(toSummary);
}

/**
 * Related articles for internal linking — the strongest on-page SEO lever we
 * control. Ranks by shared keywords within the same language, then falls back
 * to recency so every article always links out to something.
 */
export function getRelated(
  lang: string,
  slug: string,
  limit = 3,
): ArticleSummary[] {
  const current = getArticle(lang, slug);
  if (!current) return getSummaries(lang).slice(0, limit);

  const currentKeywords = new Set(
    current.seo.keywords.map((keyword) => keyword.toLowerCase()),
  );

  return getArticles(lang)
    .filter((article) => article.slug !== slug)
    .map((article) => ({
      article,
      score: article.seo.keywords.filter((keyword) =>
        currentKeywords.has(keyword.toLowerCase()),
      ).length,
    }))
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.article.publishedAt) - Date.parse(a.article.publishedAt),
    )
    .slice(0, limit)
    .map((entry) => toSummary(entry.article));
}

export function absoluteUrl(path: string): string {
  return `${site.url}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Home of one language, e.g. "/id". */
export function langPath(lang: string, suffix = ""): string {
  return `/${lang}${suffix}`;
}

export function articlePath(lang: string, slug: string): string {
  return `/${lang}/articles/${slug}`;
}

export function formatDate(iso: string, lang: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.valueOf())) return iso;
  return date.toLocaleDateString(lang, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * hreflang alternates for one page. Only languages that actually have the
 * page are listed — pointing hreflang at a 404 is worse than omitting it.
 */
export function alternatesFor(
  build: (lang: string) => string | null,
): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const code of languageCodes) {
    const path = build(code);
    if (path) entries[code] = absoluteUrl(path);
  }

  const fallback = entries[defaultLanguage];
  if (fallback) entries["x-default"] = fallback;

  return entries;
}
