"use client";

import { useEffect, useState } from "react";
import { getArticle } from "../api/get-article";
import type { Article } from "../types/article";

type ArticlePageProps = {
  slug: string;
};

export function ArticlePage({ slug }: ArticlePageProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getArticle(slug)
      .then(setArticle)
      .catch((caughtError: Error) => setError(caughtError.message));
  }, [slug]);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (error) {
    return (
      <main className="error-shell">
        <div className="error-card">
          <span className="meta-label">The Local Edit</span>
          <h1>Something went off the map.</h1>
          <p>{error}</p>
        </div>
      </main>
    );
  }

  if (!article) {
    return (
      <main className="loading-shell" aria-live="polite">
        <div className="loading-card">
          <div className="loader-mark" aria-hidden="true" />
          <span className="meta-label">The Local Edit</span>
          <p>Bringing the story to the page…</p>
        </div>
      </main>
    );
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="#top" aria-label="The Local Edit home">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-copy">
              <span className="brand-name">The Local Edit</span>
              <span className="brand-subtitle">by Local Bali Villas</span>
            </span>
          </a>
          <nav className="header-nav" aria-label="Main navigation">
            <a href="#article">Travel notes</a>
            <a href="#checklist">Villa guide</a>
            <a
              className="nav-cta"
              href={article.backlink.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              Find a villa
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="article-title">
          <img
            className="hero-image"
            src={article.heroImage}
            alt="A tranquil tropical swimming pool at a Bali villa"
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
              {article.publishedAt}
              <br />
              {article.readTime}
            </div>
            <nav className="toc" aria-label="Article sections">
              <span className="meta-label">In this guide</span>
              {article.sections.map((section) => (
                <a href={`#${section.id}`} key={section.id}>
                  {section.heading}
                </a>
              ))}
            </nav>
            <button className="share-button" onClick={copyLink} type="button">
              {copied ? "Link copied" : "Copy article link"}
            </button>
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
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                {index === 0 && (
                  <figure className="inline-image">
                    <img
                      src={article.inlineImage.src}
                      alt={article.inlineImage.alt}
                    />
                    <figcaption>{article.inlineImage.caption}</figcaption>
                  </figure>
                )}

                {index === 1 && (
                  <div className="pull-quote">
                    <blockquote>“{article.quote.text}”</blockquote>
                    <cite>{article.quote.attribution}</cite>
                  </div>
                )}

                {index === 2 && (
                  <div className="checklist" id="checklist">
                    <h3>Your pre-booking checklist</h3>
                    <ul>
                      {article.checklist.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ))}

            <aside className="backlink-card" aria-label="Recommended resource">
              <div>
                <span className="meta-label">{article.backlink.label}</span>
                <h3>{article.backlink.title}</h3>
                <p>{article.backlink.description}</p>
              </div>
              <a
                href={article.backlink.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit localbalivillas.com ↗
              </a>
            </aside>
          </article>
        </div>
      </main>

      <footer className="article-footer">
        <div className="footer-inner">
          <h2>Stay somewhere that feels like your own corner of Bali.</h2>
          <div className="footer-links">
            <a
              href={article.backlink.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              localbalivillas.com ↗
            </a>
            <span>Travel slowly. Stay locally.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
