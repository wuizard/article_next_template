/**
 * Site-wide settings, generated from `.env` into `content/site.json` at build
 * time. Pages read this rather than `process.env` so nothing depends on
 * environment variables being present in the running server.
 */
export type SiteLanguage = {
  /** URL prefix and <html lang>, e.g. "id". */
  code: string;
  /** Shown in the header language switcher, e.g. "Bahasa Indonesia". */
  label: string;
  /** og:locale, e.g. "id_ID". */
  locale: string;
  tagline: string;
  /** Short label for the vertical rail on the archive page. */
  edition: string;
  description: string;
  topic: string;
  keywords: string[];
  cta: {
    label: string;
    title: string;
    description: string;
    href: string;
  };
};

export type SiteConfig = {
  /** Public origin, no trailing slash. All canonical URLs derive from it. */
  url: string;
  name: string;
  /** false emits noindex everywhere + a blanket robots.txt Disallow. */
  indexable: boolean;
  /** Adds noindex to pages built purely from syndicated RSS excerpts. */
  itemNoindex: boolean;
  twitterHandle: string;
  /** "/" redirects here; also the hreflang x-default. */
  defaultLanguage: string;
  brand: {
    name: string;
    url: string;
    logo: string;
  };
  languages: SiteLanguage[];
  generatedAt: string;
};
