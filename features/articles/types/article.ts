export type ArticleSection = {
  id: string;
  kicker: string;
  heading: string;
  paragraphs: string[];
};

export type ArticleFaq = {
  question: string;
  answer: string;
};

export type ArticleSeo = {
  /** <= 60 chars. Used for <title>. Falls back to `title`. */
  metaTitle: string;
  /** 140–158 chars. Used for the meta description and OG description. */
  metaDescription: string;
  /** The single term this page is written to rank for. */
  focusKeyword: string;
  keywords: string[];
};

/**
 * Where the article came from. `informedBy` records feeds that shaped an
 * AI-written piece; `originalUrl` is set only for syndicated RSS excerpts,
 * which link back to and credit the publisher.
 */
export type ArticleSource = {
  type: string;
  feedTitle?: string;
  originalUrl?: string;
  originalTitle?: string;
  informedBy?: string[];
};

export type Article = {
  slug: string;
  /** Language code — matches the URL prefix and the SiteLanguage entry. */
  lang: string;
  /** "draft" never reaches a build; only "published" is in the manifest. */
  status: string;
  category: string;
  title: string;
  deck: string;
  heroImage: string;
  heroImageAlt: string;
  /** ISO 8601. */
  publishedAt: string;
  /** ISO 8601. */
  updatedAt: string;
  readTime: string;
  wordCount: number;
  author: {
    name: string;
    role: string;
    initials: string;
  };
  seo: ArticleSeo;
  introduction: string;
  sections: ArticleSection[];
  quote: {
    text: string;
    attribution: string;
  };
  inlineImage: {
    src: string;
    alt: string;
    caption: string;
  };
  checklist: string[];
  faqs: ArticleFaq[];
  backlink: {
    label: string;
    title: string;
    description: string;
    href: string;
  };
  source: ArticleSource;
};

export type ArticleSummary = Pick<
  Article,
  | "slug"
  | "lang"
  | "category"
  | "title"
  | "deck"
  | "heroImage"
  | "heroImageAlt"
  | "publishedAt"
  | "updatedAt"
  | "readTime"
>;
