"use client";

import { useEffect, useState } from "react";
import { getArticles } from "../api/get-article";
import type { ArticleSummary } from "../types/article";

export function ArticleIndexPage() {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getArticles()
      .then(setArticles)
      .catch((caughtError: Error) => setError(caughtError.message));
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/" aria-label="The Local Edit home">
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-copy">
              <span className="brand-name">The Local Edit</span>
              <span className="brand-subtitle">by Local Bali Villas</span>
            </span>
          </a>
          <nav className="header-nav" aria-label="Main navigation">
            <a href="#latest">Travel notes</a>
            <a
              className="nav-cta"
              href="https://localbalivillas.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Find a villa
            </a>
          </nav>
        </div>
      </header>

      <main className="journal-home">
        <section className="journal-intro">
          <span className="journal-edition">Bali notes · 2026</span>
          <p className="journal-kicker">The Local Edit</p>
          <h1>Travel slowly.<br />Stay locally.</h1>
          <p className="journal-deck">
            Considered guides to Bali’s villas, neighbourhoods, and everyday
            rituals—written for travellers who want to feel at home.
          </p>
        </section>

        <section className="latest-section" id="latest">
          <div className="section-heading-row">
            <span>Latest story</span>
            <span>01</span>
          </div>

          {error && <p className="index-message">{error}</p>}

          {!error && articles.length === 0 && (
            <p className="index-message">Gathering the latest travel notes…</p>
          )}

          <div className="article-grid">
            {articles.map((article) => (
              <a
                className="article-card"
                href={`/articles/${article.slug}`}
                key={article.slug}
              >
                <div className="article-card-image-wrap">
                  <img
                    className="article-card-image"
                    src={article.heroImage}
                    alt=""
                  />
                  <span className="article-card-arrow" aria-hidden="true">↗</span>
                </div>
                <div className="article-card-copy">
                  <div className="article-card-meta">
                    <span>{article.category}</span>
                    <span>{article.readTime}</span>
                  </div>
                  <h2>{article.title}</h2>
                  <p>{article.deck}</p>
                  <span className="read-story">Read the full story</span>
                </div>
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="article-footer index-footer">
        <div className="footer-inner">
          <h2>Find your own corner of Bali.</h2>
          <div className="footer-links">
            <a
              href="https://localbalivillas.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              Browse Local Bali Villas ↗
            </a>
            <span>Travel slowly. Stay locally.</span>
          </div>
        </div>
      </footer>
    </>
  );
}
