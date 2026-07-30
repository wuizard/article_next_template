import Link from "next/link";
import { getLanguage, langPath, languages, site } from "../data/articles";
import { getStrings } from "../i18n/strings";

type SiteHeaderProps = {
  lang: string;
  /** Where the call to action points. */
  ctaHref?: string;
  /**
   * Destination for each language in the switcher. Return null to send that
   * language to its archive instead — used when an article has no translation.
   */
  switcherHref?: (code: string) => string | null;
  /** Extra links between the brand and the CTA. */
  children?: React.ReactNode;
};

/**
 * Plain links, not a JS dropdown: crawlers follow them, and they work before
 * hydration. Each one is a real, indexable URL for that language.
 */
function LanguageSwitcher({
  lang,
  switcherHref,
}: {
  lang: string;
  switcherHref?: (code: string) => string | null;
}) {
  if (languages.length < 2) return null;
  const t = getStrings(lang);

  return (
    <div className="lang-switcher" role="group" aria-label={t.languageSwitcherAria}>
      {languages.map((entry) => {
        const current = entry.code === lang;
        return (
          <Link
            key={entry.code}
            className={`lang-option${current ? " is-current" : ""}`}
            href={switcherHref?.(entry.code) ?? langPath(entry.code)}
            hrefLang={entry.code}
            lang={entry.code}
            aria-current={current ? "true" : undefined}
            title={entry.label}
          >
            {entry.code.toUpperCase()}
          </Link>
        );
      })}
    </div>
  );
}

export function SiteHeader({
  lang,
  ctaHref,
  switcherHref,
  children,
}: SiteHeaderProps) {
  const t = getStrings(lang);
  const language = getLanguage(lang);

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link
          className="brand"
          href={langPath(lang)}
          aria-label={t.homeAria(site.name)}
        >
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-copy">
            <span className="brand-name">{site.name}</span>
            <span className="brand-subtitle">{language.tagline}</span>
          </span>
        </Link>
        <nav className="header-nav" aria-label={t.mainNavAria}>
          {children}
          <LanguageSwitcher lang={lang} switcherHref={switcherHref} />
          <a
            className="nav-cta"
            href={ctaHref ?? language.cta.href}
            target="_blank"
            rel="noopener"
          >
            {t.navCta}
          </a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({
  lang,
  heading,
  ctaHref,
  className = "",
}: {
  lang: string;
  heading: string;
  ctaHref?: string;
  className?: string;
}) {
  const t = getStrings(lang);
  const href = ctaHref ?? getLanguage(lang).cta.href;
  const label = href.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  return (
    <footer className={`article-footer ${className}`.trim()}>
      <div className="footer-inner">
        <h2>{heading}</h2>
        <div className="footer-links">
          <a href={href} target="_blank" rel="noopener">
            {label} ↗
          </a>
          <span>{t.footerTagline}</span>
        </div>
      </div>
    </footer>
  );
}
