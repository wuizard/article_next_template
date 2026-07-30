import {
  absoluteUrl,
  articlePath,
  getLanguage,
  langPath,
  site,
} from "../data/articles";
import { getStrings } from "../i18n/strings";
import type { Article, ArticleSummary } from "../types/article";

type JsonLd = Record<string, unknown>;

function publisher(): JsonLd {
  return {
    "@type": "Organization",
    name: site.brand.name,
    url: site.brand.url,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(site.brand.logo),
    },
  };
}

/** Site-level graph: emitted once per page, in the language layout. */
export function siteJsonLd(lang: string): JsonLd {
  const language = getLanguage(lang);
  const url = absoluteUrl(langPath(lang));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${url}#website`,
        url,
        name: site.name,
        description: language.description,
        inLanguage: lang,
        publisher: { "@id": `${site.url}/#organization` },
      },
      {
        "@type": "Organization",
        "@id": `${site.url}/#organization`,
        name: site.brand.name,
        url: site.brand.url,
        logo: {
          "@type": "ImageObject",
          url: absoluteUrl(site.brand.logo),
        },
      },
    ],
  };
}

/** Archive page: the index as an ordered list, so Google sees the whole set. */
export function itemListJsonLd(
  lang: string,
  summaries: ArticleSummary[],
): JsonLd {
  const t = getStrings(lang);

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${site.name} — ${t.latestStories}`,
    itemListElement: summaries.map((summary, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(articlePath(lang, summary.slug)),
      name: summary.title,
    })),
  };
}

export function breadcrumbJsonLd(article: Article): JsonLd {
  const t = getStrings(article.lang);

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t.breadcrumbHome,
        item: absoluteUrl(langPath(article.lang)),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: article.category,
        item: absoluteUrl(langPath(article.lang, "#latest")),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: absoluteUrl(articlePath(article.lang, article.slug)),
      },
    ],
  };
}

export function articleJsonLd(article: Article): JsonLd {
  const url = absoluteUrl(articlePath(article.lang, article.slug));
  const syndicated = Boolean(article.source.originalUrl);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    headline: article.title,
    description: article.seo.metaDescription,
    image: [article.heroImage],
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    articleSection: article.category,
    keywords: article.seo.keywords.join(", "),
    wordCount: article.wordCount,
    inLanguage: article.lang,
    author: {
      "@type": "Person",
      name: article.author.name,
      jobTitle: article.author.role,
    },
    publisher: publisher(),
    // Be honest with crawlers about summarised third-party reporting.
    ...(syndicated
      ? {
          isBasedOn: article.source.originalUrl,
          citation: article.source.originalUrl,
        }
      : {}),
  };
}

/** Only emitted when the article actually has FAQs — empty markup is a risk. */
export function faqJsonLd(article: Article): JsonLd | null {
  if (article.faqs.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: article.lang,
    mainEntity: article.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/**
 * Renders JSON-LD into a script tag. `<` is escaped so a stray "</script>" in
 * generated copy can never break out of the block.
 */
export function jsonLdScript(data: JsonLd) {
  return {
    __html: JSON.stringify(data).replace(/</g, "\\u003c"),
  };
}
