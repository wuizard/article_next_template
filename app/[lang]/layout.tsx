import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/features/articles/components/json-ld";
import {
  absoluteUrl,
  getLanguage,
  isLanguage,
  langPath,
  languageCodes,
  site,
} from "@/features/articles/data/articles";
import { getStrings } from "@/features/articles/i18n/strings";
import { siteJsonLd } from "@/features/articles/seo/structured-data";
import "../globals.css";

type LangLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
};

/**
 * This is the root layout — there is no `app/layout.tsx`, because `<html lang>`
 * has to vary per language and a root layout cannot read the child route.
 * `/` is redirected to the default language in `next.config.ts`.
 */
export function generateStaticParams() {
  return languageCodes.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  if (!isLanguage(lang)) return {};

  const language = getLanguage(lang);
  const title = language.tagline
    ? `${site.name} | ${language.tagline}`
    : site.name;

  return {
    metadataBase: new URL(site.url),
    title: {
      default: title,
      // Article pages supply their own <title>; this keeps the brand suffix.
      template: `%s | ${site.name}`,
    },
    description: language.description,
    applicationName: site.name,
    keywords: language.keywords,
    authors: [{ name: site.brand.name, url: site.brand.url }],
    creator: site.brand.name,
    publisher: site.brand.name,
    // Each page overrides these; hreflang is set per page, where it can be
    // accurate about whether a real translation exists.
    alternates: { canonical: langPath(lang) },
    robots: site.indexable
      ? {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        }
      : { index: false, follow: false },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
    },
    openGraph: {
      type: "website",
      siteName: site.name,
      locale: language.locale,
      url: absoluteUrl(langPath(lang)),
      title,
      description: language.description,
      images: [{ url: absoluteUrl("/og.png"), width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: language.description,
      images: [absoluteUrl("/og.png")],
      ...(site.twitterHandle ? { site: site.twitterHandle } : {}),
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: LangLayoutProps) {
  const { lang } = await params;
  if (!isLanguage(lang)) notFound();

  const t = getStrings(lang);

  return (
    <html lang={lang}>
      <body>
        {/* React 19 hoists these into <head>; vinext does not yet emit
            `alternates.types` from the Metadata object. */}
        <link
          rel="alternate"
          type="application/rss+xml"
          title={`${site.name} — ${lang.toUpperCase()}`}
          href={langPath(lang, "/feed.xml")}
        />
        <a className="skip-link" href="#article">
          {t.skipToContent}
        </a>
        {children}
        <JsonLd data={siteJsonLd(lang)} />
      </body>
    </html>
  );
}
