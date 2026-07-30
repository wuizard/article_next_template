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
  getLanguage,
  getSummaries,
  site,
} from "../data/articles";
import { getStrings } from "../i18n/strings";
import { itemListJsonLd } from "../seo/structured-data";
import { JsonLd } from "./json-ld";
import { SiteFooter, SiteHeader } from "./site-chrome";

/**
 * Server component: the full archive is in the initial HTML, so crawlers see
 * every headline and deck without executing JavaScript.
 */
export function ArticleIndexPage({ lang }: { lang: string }) {
  const t = getStrings(lang);
  const language = getLanguage(lang);
  const summaries = getSummaries(lang);
  const headKeyword = language.keywords[0] ?? language.topic;

  return (
    <>
      <JsonLd data={itemListJsonLd(lang, summaries)} />

      <SiteHeader lang={lang}>
        <a href="#latest">{t.navJournal}</a>
      </SiteHeader>

      <main className="journal-home" id="article">
        <section className="journal-intro">
          {language.edition && (
            <span className="journal-edition">{language.edition}</span>
          )}
          <p className="journal-kicker">{site.name}</p>
          <h1>
            {t.headline[0]}
            <br />
            {t.headline[1]}
          </h1>
          <p className="journal-deck">{language.description}</p>
        </section>

        <section className="latest-section" id="latest">
          <div className="section-heading-row">
            <span>{t.latestStories}</span>
            <span>{String(summaries.length).padStart(2, "0")}</span>
          </div>

          {summaries.length === 0 ? (
            <p className="index-message">
              {t.emptyIndexBefore}
              <code>npm run generate</code>
              {t.emptyIndexAfter}
            </p>
          ) : (
            <div className="article-grid">
              {summaries.map((article) => (
                <Link
                  className="article-card"
                  href={articlePath(lang, article.slug)}
                  key={article.slug}
                >
                  <div className="article-card-image-wrap">
                    <img
                      className="article-card-image"
                      src={article.heroImage}
                      alt={article.heroImageAlt}
                      loading="lazy"
                      decoding="async"
                    />
                    <span className="article-card-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </div>
                  <div className="article-card-copy">
                    <div className="article-card-meta">
                      <span>{article.category}</span>
                      <span>{article.readTime}</span>
                    </div>
                    <h2>{article.title}</h2>
                    <p>{article.deck}</p>
                    <time dateTime={article.publishedAt}>
                      {formatDate(article.publishedAt, lang)}
                    </time>
                    <span className="read-story">{t.readStory}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {language.keywords.length > 0 && (
          <section className="topic-section" aria-labelledby="topics-heading">
            <div className="section-heading-row">
              <span id="topics-heading">{t.whatWeCover}</span>
              <span>—</span>
            </div>
            <p className="topic-lede">{t.topicLede(site.name, headKeyword)}</p>
            <ul className="topic-list">
              {language.keywords.map((keyword) => (
                <li key={keyword}>{keyword}</li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <SiteFooter
        lang={lang}
        heading={t.footerHomeHeading}
        className="index-footer"
      />
    </>
  );
}
