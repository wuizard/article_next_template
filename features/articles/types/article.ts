export type ArticleSection = {
  id: string;
  kicker: string;
  heading: string;
  paragraphs: string[];
};

export type Article = {
  slug: string;
  category: string;
  title: string;
  deck: string;
  heroImage: string;
  publishedAt: string;
  readTime: string;
  author: {
    name: string;
    role: string;
    initials: string;
  };
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
  backlink: {
    label: string;
    title: string;
    description: string;
    href: string;
  };
};

export type ArticleSummary = Pick<
  Article,
  | "slug"
  | "category"
  | "title"
  | "deck"
  | "heroImage"
  | "publishedAt"
  | "readTime"
>;
