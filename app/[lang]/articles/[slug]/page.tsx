import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticlePage } from "@/features/articles/components/article-page";
import {
  articlePath,
  getAllArticles,
  getArticle,
  getLanguage,
  isLanguage,
  site,
} from "@/features/articles/data/articles";

type ArticleDetailProps = {
  params: Promise<{ lang: string; slug: string }>;
};

/** Pre-renders every article in every language at build time. */
export function generateStaticParams() {
  return getAllArticles().map((article) => ({
    lang: article.lang,
    slug: article.slug,
  }));
}

export async function generateMetadata({
  params,
}: ArticleDetailProps): Promise<Metadata> {
  const { lang, slug } = await params;
  const article = isLanguage(lang) ? getArticle(lang, slug) : undefined;

  if (!article) {
    return {
      title: "Not found",
      robots: { index: false, follow: true },
    };
  }

  const canonical = articlePath(lang, article.slug);
  const syndicated = Boolean(article.source.originalUrl);

  return {
    title: { absolute: `${article.seo.metaTitle} | ${site.name}` },
    description: article.seo.metaDescription,
    keywords: article.seo.keywords,
    authors: [{ name: article.author.name }],
    // No hreflang: an article has no counterpart at the same slug in another
    // language, and a self-referencing hreflang set of one signals nothing.
    alternates: { canonical },
    // Syndicated excerpts are thin by nature; RSS_ITEM_NOINDEX keeps them out
    // of the index without hiding them from readers.
    ...(syndicated && site.itemNoindex
      ? { robots: { index: false, follow: true } }
      : {}),
    openGraph: {
      type: "article",
      url: canonical,
      siteName: site.name,
      locale: getLanguage(lang).locale,
      title: article.title,
      description: article.seo.metaDescription,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [article.author.name],
      section: article.category,
      tags: article.seo.keywords,
      images: [{ url: article.heroImage, alt: article.heroImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.seo.metaDescription,
      images: [article.heroImage],
    },
  };
}

export default async function ArticleDetail({ params }: ArticleDetailProps) {
  const { lang, slug } = await params;
  if (!isLanguage(lang)) notFound();

  return <ArticlePage lang={lang} slug={slug} />;
}
