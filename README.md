# The Local Edit

A multilingual SEO journal that drafts its own articles, waits for you to
approve them, and publishes as static server-rendered pages.

Indonesian and English, each with its own URL prefix, its own feeds, its own
keywords, and its own article set.

---

## How it works

```
  .env                     topic · keywords · feeds · languages
    │
    ▼
  generator (nightly)      RSS gives the topical signal
    │                      Claude writes an original article per keyword
    ▼
  content/drafts/id/…      never rendered, never in a build
    │
    ▼
  review panel             read · edit · SEO checks · approve or reject
    │
    ▼
  content/articles/id/…    committed to git, this is the archive
    │
    ▼
  /id  /en                 server-rendered HTML, structured data, sitemap
```

Two properties worth understanding:

- **No API key ever reaches the browser or the web server.** Drafting happens
  in a separate process before publish; the site only reads committed JSON.
- **Nothing publishes itself.** The nightly job writes drafts. A human approves
  them. That is deliberate — unreviewed bulk output is exactly what Google's
  spam policies target.

---

## Quick start

```bash
npm install
cp .env.example .env      # set SITE_URL, keywords, ANTHROPIC_API_KEY
npm run generate          # writes drafts
npm run review            # approve them at localhost:4100
npm run dev
```

Without `ANTHROPIC_API_KEY` the generator writes clearly-labelled placeholder
drafts, so you can exercise the whole pipeline — panel, checks, build — before
spending anything. The review panel refuses to publish them.

For a real server, see **[deploy/README.md](deploy/README.md)**.

---

## Commands

```bash
npm run generate                  # one draft per language
npm run generate -- --count=3     # three per language
npm run generate -- --lang=id     # Indonesian only
npm run generate -- --publish     # skip review (seeding only)
npm run content:plan              # show the plan and feed signal, write nothing
npm run content:sync              # refresh site.json + manifest, no API calls

npm run review                    # the review panel
npm run admin:password            # generate ADMIN_PASSWORD_HASH

npm run dev / build / start
npm test                          # build, then the full suite
npm run lint
```

---

## Languages

`SITE_LANGUAGES=id,en` in `.env`. The first is the default: `/` redirects to
it and it is the hreflang `x-default`.

Each language has its own `.env` block using a `_<LANG>` suffix — anything
unsuffixed applies to all of them:

```ini
CONTENT_KEYWORDS_ID=villa untuk keluarga di bali, villa ubud, …
CONTENT_KEYWORDS_EN=bali villa for families, ubud villa, …
RSS_FEEDS_ID=https://bali.antaranews.com/rss/terkini.xml, …
RSS_FEEDS_EN=https://www.thebalisun.com/feed/, …
```

Feeds can be in any language; the article is written in the target language
either way. Readers switch with the ID/EN control in the header — plain links
to real URLs, so crawlers follow them and they work without JavaScript.

New articles receive one randomly selected inline backlink from the
comma-separated pool in `.env`. The selection happens once during generation,
is inserted subtly into the prose, and is saved in the draft JSON so the URL
stays unchanged between builds:

```ini
BACKLINK_URLS=https://localbalivillas.com,https://localbalivillas.com/villas
BACKLINK_URLS_ID=https://localbalivillas.com/id,https://localbalivillas.com/villa
```

`BACKLINK_URLS_<LANG>` overrides the shared pool for that language. `CTA_HREF`
is separate and always controls the header, recommendation button, and footer;
it also remains the inline-link fallback when no backlink pool is configured.

UI chrome (navigation, headings, buttons) lives in
`features/articles/i18n/strings.ts`. To add a language: copy a dictionary,
translate it, add the code to `SITE_LANGUAGES`. A language with no dictionary
still works — it falls back to English chrome with correctly translated
articles.

---

## Cost

Measured usage and dollars print after every run. Rough figures per
2,000-word article:

| Model | Price | Per article | One a day, both languages |
| --- | --- | --- | --- |
| `claude-sonnet-5` at effort `medium` | $3/$15 per MTok | ~$0.05–0.10 | ~$3–6/mo |
| `claude-opus-5` at effort `high` | $5/$25 per MTok | ~$0.25 | ~$15/mo |

Sonnet 5 is on introductory pricing of $2/$10 per MTok through 2026-08-31.
Output tokens dominate the bill and thinking is most of the output, so
`CONTENT_EFFORT` is the biggest lever. The shipped default is Sonnet at
`medium`; switch to Opus at `high` for cornerstone pages.

---

## What actually gets you ranked

The technical layer is done and is not the hard part. It makes you *eligible*
to rank:

**Rendering** — every page is a React Server Component; the full article text,
headings and FAQs are in the initial HTML. The only client-side island is the
copy-link button. Articles pre-render at build time.

**Metadata** — per-page title (≤ 60 chars), meta description (140–158),
`rel="canonical"`, hreflang across languages with `x-default`, Open Graph and
Twitter cards, `article:published_time` / `modified_time`.

**Structured data** — `WebSite`, `Organization`, `ItemList`, `Article` (with
author, publisher, dates, word count, `inLanguage`), `BreadcrumbList` matching
the visible trail, and `FAQPage` when an article has FAQs.

**Crawl surface** — `/sitemap.xml` with per-article `lastmod` and hreflang
alternates, `/robots.txt`, and `/id/feed.xml` per language.

**On-page** — exactly one `<h1>`, real `<h2>` sections with stable anchors,
keyword-ranked related-article linking, alt text everywhere, `fetchPriority`
on the LCP image, visible breadcrumbs, a skip link, `<time datetime>`.

**What this repo cannot do for you**, and what actually decides rankings:

1. **Target the long tail first.** "sewa villa bali" belongs to Airbnb,
   Booking and Agoda. "villa di canggu yang kolamnya berpagar untuk anak" is
   winnable, converts better, and fifty of them compound.
2. **Write what a booking platform structurally cannot.** Real properties,
   real photos, staff who know which road floods in February. That is the moat.
3. **E-E-A-T.** A named author with a real bio, an About page, a physical
   address and phone number, consistent with your Google Business Profile.
   Google applies extra scrutiny to travel and accommodation.
4. **Backlinks.** Local directories, partnerships with Bali restaurants and
   tour operators, being quoted in travel press.
5. **Time.** A new domain takes roughly 6–12 months regardless of quality.

After deploying, submit `sitemap.xml` in Google Search Console and check a
live article in the [Rich Results Test](https://search.google.com/test/rich-results).

---

## The review panel

A separate Node service from the public site, so the site keeps no auth code
and no write endpoints. It binds to `127.0.0.1` and answers only to the
hostnames in `ADMIN_ALLOWED_HOSTS` — any other `Host` header gets a 403 before
routing, so a stray proxy vhost cannot expose it.

For each draft it shows the queue, a rendered preview, inline editing of every
field, and checks that gate approval:

| Blocks approval | Warns |
| --- | --- |
| Placeholder copy from a keyless run | Headline outside 30–65 characters |
| Meta title missing or over 60 chars | Meta description outside 120–158 |
| Missing focus keyword | Keyword missing from one or two placements |
| Under 400 words (truncated output) | Short of the word target |
| Malformed slug | Keyword density over 3% |
| Slug already published | Thin sections, few FAQs, duplicate keyword |

Auth is a scrypt password hash plus an HMAC-signed session cookie, with CSRF
tokens on every mutation and a throttle on failed logins. The password is
never stored — `npm run admin:password` prints a hash for you to paste.

---

## Project layout

```
.env                          your config (gitignored)
.env.example                  annotated template

scripts/
  generate-content.mjs        the nightly generator
  lib/config.mjs              .env → typed config, per language
  lib/rss.mjs                 dependency-free RSS/Atom reader
  lib/ai.mjs                  Claude calls, structured outputs, cost accounting
  lib/compose.mjs             payload → finished Article
  lib/store.mjs               all reads and writes of content/
  admin/                      the review panel

content/
  site.json                   generated from .env
  drafts/<lang>/*.json        awaiting review (gitignored)
  articles/<lang>/*.json      published, committed
  manifest.ts                 generated typed index

features/articles/
  types/                      Article + SiteConfig contracts
  data/articles.ts            data access, related-article ranking
  i18n/strings.ts             UI chrome per language
  seo/structured-data.ts      JSON-LD builders
  components/                 server components (+ one client island)

app/
  [lang]/                     archive, articles, feed — the root layout
  sitemap.xml/ robots.txt/    crawl surface
  api/articles/               JSON API for external consumers

deploy/                       systemd units, nginx, install guide
tests/                        SEO surface + review panel logic
```

---

## A note on generated content

The prompt forbids invented specifics — no fake prices, businesses, statistics
or quotes attributed to real people — and forbids reproducing wording from any
feed item it is shown. That reduces risk; it does not eliminate it. The review
step exists because **you have to read what it writes before you publish it.**
