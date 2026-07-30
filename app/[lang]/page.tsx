import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArticleIndexPage } from "@/features/articles/components/article-index-page";
import {
  alternatesFor,
  getLanguage,
  isLanguage,
  langPath,
  languageCodes,
  site,
} from "@/features/articles/data/articles";

type ArchiveProps = {
  params: Promise<{ lang: string }>;
};

export function generateStaticParams() {
  return languageCodes.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: ArchiveProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isLanguage(lang)) return {};

  const language = getLanguage(lang);
  const title = language.tagline
    ? `${site.name} | ${language.tagline}`
    : site.name;

  return {
    // Absolute so the archive keeps its own title instead of "X | X".
    title: { absolute: title },
    description: language.description,
    alternates: {
      canonical: langPath(lang),
      languages: alternatesFor((code) => langPath(code)),
    },
  };
}

export default async function Archive({ params }: ArchiveProps) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();

  return <ArticleIndexPage lang={lang} />;
}
