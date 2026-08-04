/* eslint-disable @next/next/no-img-element --
   Hero and card images are remote URLs from CONTENT_IMAGE_POOL, and
   `next/image` here would route them through the Worker's optional
   Cloudflare IMAGES binding, which this project does not declare.
   Every image below sits in a container with CSS-fixed dimensions, so
   there is no layout shift; loading/decoding hints are set explicitly. */
import Link from "next/link";
import {
  articlePath,
  formatDate,
  getArticle,
  getRelated,
  langPath,
  site,
} from "../data/articles";
import { getStrings } from "../i18n/strings";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
} from "../seo/structured-data";
import { JsonLd } from "./json-ld";
import { ShareButton } from "./share-button";
import { SiteFooter, SiteHeader } from "./site-chrome";
import { backlinkButtonLabel } from "../lib/backlink-label.mjs";

/**
 * Server component. The entire article body — headings, prose, FAQs, internal
 * links — is present in the first byte of HTML. Only the copy-link button
 * hydrates.
 */
export function ArticlePage({ lang, slug }: { lang: string; slug: string }) {
  const t = getStrings(lang);
  const article = getArticle(lang, slug);

  if (!article) {
    return (
      <main className="error-shell" id="article">
        <div className="error-card">
          <span className="meta-label">{site.name}</span>
          <h1>{t.notFoundHeading}</h1>
          <p>
            {t.notFoundLead}
            <Link href={langPath(lang)}>{t.notFoundLink}</Link>.
          </p>
        </div>
      </main>
    );
  }

  const related = getRelated(lang, article.slug);

  // A translation rarely shares a slug, so the switcher sends other languages
  // to their archive rather than to a URL that would 404.
  const switcherHref = (code: string) =>
    code === lang ? articlePath(lang, article.slug) : langPath(code);

  return (
    <>
      <JsonLd data={articleJsonLd(article)} />
      <JsonLd data={breadcrumbJsonLd(article)} />
      <JsonLd data={faqJsonLd(article)} />

      <SiteHeader
        lang={lang}
        ctaHref={article.backlink.href}
        switcherHref={switcherHref}
      >
        <Link href={langPath(lang)}>{t.navJournal}</Link>
        {article.checklist.length > 0 && (
          <a href="#checklist">{t.navGuide}</a>
        )}
      </SiteHeader>

      <main id="top">
        <nav className="breadcrumbs" aria-label={t.breadcrumbAria}>
          <ol>
            <li>
              <Link href={langPath(lang)}>{t.breadcrumbHome}</Link>
            </li>
            <li>
              <Link href={langPath(lang, "#latest")}>{article.category}</Link>
            </li>
            <li aria-current="page">{article.title}</li>
          </ol>
        </nav>

        <section className="hero" aria-labelledby="article-title">
          <img
            className="hero-image"
            src={article.heroImage}
            alt={article.heroImageAlt}
            fetchPriority="high"
          />
          <div className="hero-content">
            <div className="eyebrow">{article.category}</div>
            <h1 id="article-title">{article.title}</h1>
            <p className="hero-deck">{article.deck}</p>
          </div>
        </section>

        <div className="article-frame" id="article">
          <aside className="article-aside">
            <div className="author-block">
              <div className="avatar" aria-hidden="true">
                {article.author.initials}
              </div>
              <div>
                <div className="author-name">{article.author.name}</div>
                <div className="author-role">{article.author.role}</div>
              </div>
            </div>
            <div className="read-meta">
              <time dateTime={article.publishedAt}>
                {formatDate(article.publishedAt, lang)}
              </time>
              <br />
              {article.readTime}
              {article.updatedAt !== article.publishedAt && (
                <>
                  <br />
                  <span className="updated-note">
                    {t.updatedPrefix}{" "}
                    <time dateTime={article.updatedAt}>
                      {formatDate(article.updatedAt, lang)}
                    </time>
                  </span>
                </>
              )}
            </div>
            <nav className="toc" aria-label={t.articleSectionsAria}>
              <span className="meta-label">{t.inThisGuide}</span>
              {article.sections.map((section) => (
                <a href={`#${section.id}`} key={section.id}>
                  {section.heading}
                </a>
              ))}
              {article.faqs.length > 0 && (
                <a href="#faq">{t.frequentlyAsked}</a>
              )}
            </nav>
            <ShareButton label={t.copyLink} copiedLabel={t.linkCopied} />
          </aside>

          <article className="article-body">
            <p className="article-intro">{article.introduction}</p>

            {article.sections.map((section, index) => (
              <section
                className="article-section"
                id={section.id}
                key={section.id}
              >
                <span className="section-kicker">{section.kicker}</span>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((paragraph, paragraphIndex) => (
                  <p key={`${section.id}-${paragraphIndex}`}>{paragraph}</p>
                ))}

                {index === 0 && article.inlineImage.src && (
                  <figure className="inline-image">
                    <img
                      src={article.inlineImage.src}
                      alt={article.inlineImage.alt}
                      loading="lazy"
                      decoding="async"
                    />
                    <figcaption>{article.inlineImage.caption}</figcaption>
                  </figure>
                )}

                {index === 1 && article.quote.text && (
                  <div className="pull-quote">
                    <blockquote>“{article.quote.text}”</blockquote>
                    <cite>{article.quote.attribution}</cite>
                  </div>
                )}

                {index === 2 && article.checklist.length > 0 && (
                  <div className="checklist" id="checklist">
                    <h3>{t.checklistHeading}</h3>
                    <ul>
                      {article.checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ))}

            {article.faqs.length > 0 && (
              <section className="faq-section" id="faq">
                <span className="section-kicker">{t.frequentlyAsked}</span>
                <h2>{t.faqHeading}</h2>
                <dl className="faq-list">
                  {article.faqs.map((faq) => (
                    <div className="faq-item" key={faq.question}>
                      <dt>{faq.question}</dt>
                      <dd>{faq.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {article.source.originalUrl && (
              <p className="source-note">
                {t.sourceNotePrefix}
                <a
                  href={article.source.originalUrl}
                  target="_blank"
                  rel="noopener nofollow"
                >
                  {article.source.originalTitle ?? t.sourceNoteFallbackLink}
                </a>
                {t.sourceNoteBy}
                {article.source.feedTitle}
                {t.sourceNoteSuffix}
              </p>
            )}

            <aside className="backlink-card" aria-label={t.recommendedAria}>
              <div>
                <span className="meta-label">{article.backlink.label}</span>
                <h3>{article.backlink.title}</h3>
                <p>{article.backlink.description}</p>
              </div>
              <a href={article.backlink.href} target="_blank" rel="noopener">
                {backlinkButtonLabel(article.backlink.href, {
                  visitPrefix: t.visitPrefix,
                  externalLabel: t.visitSite,
                })}{" "}
                ↗
              </a>
            </aside>

            {related.length > 0 && (
              <section className="related" aria-labelledby="related-heading">
                <h2 id="related-heading">{t.keepReading}</h2>
                <ul className="related-list">
                  {related.map((item) => (
                    <li key={item.slug}>
                      <Link href={articlePath(lang, item.slug)}>
                        <span className="related-category">{item.category}</span>
                        <span className="related-title">{item.title}</span>
                        <span className="related-deck">{item.deck}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

          </article>
        </div>
      </main>

      <SiteFooter
        lang={lang}
        heading={t.footerArticleHeading}
        ctaHref={article.backlink.href}
      />
    </>
  );
}
