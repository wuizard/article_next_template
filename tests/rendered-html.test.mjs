/**
 * Verifies the SEO surface of the built server: language-prefixed routing,
 * server-rendered article text, canonical/hreflang/OG metadata, structured
 * data, sitemap, robots, and RSS.
 *
 * These assertions are the regression net for search visibility — if a change
 * moves rendering back to the client, breaks a language route, or drops a
 * canonical or JSON-LD block, these fail.
 */
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const contentUrl = new URL("../content/", import.meta.url);
const site = JSON.parse(
  await readFile(new URL("site.json", contentUrl), "utf8"),
);

const languages = site.languages.map((entry) => entry.code);
const defaultLanguage = site.defaultLanguage;

/** One published article per language, to assert against. */
const samples = Object.fromEntries(
  await Promise.all(
    languages.map(async (lang) => {
      const dir = new URL(`articles/${lang}/`, contentUrl);
      const files = (await readdir(dir)).filter((name) =>
        name.endsWith(".json"),
      );
      const articles = await Promise.all(
        files.map(async (name) =>
          JSON.parse(await readFile(new URL(name, dir), "utf8")),
        ),
      );
      return [lang, articles[0]];
    }),
  ),
);

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

async function request(path, accept = "text/html") {
  return worker.fetch(
    new Request(`http://localhost${path}`, { headers: { accept } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

async function html(path) {
  const response = await request(path);
  assert.equal(response.status, 200, `${path} should return 200`);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  return response.text();
}

function head(markup) {
  return markup.split("</head>")[0];
}

/** Every <script type="application/ld+json"> block on the page, parsed. */
function jsonLdBlocks(markup) {
  return [
    ...markup.matchAll(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map(([, body]) => JSON.parse(body.replace(/\\u003c/g, "<")));
}

function findType(blocks, type) {
  for (const block of blocks) {
    if (block["@type"] === type) return block;
    for (const node of block["@graph"] ?? []) {
      if (node["@type"] === type) return node;
    }
  }
  return undefined;
}

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("every page lives under a language prefix", async () => {
  const root = await request("/");
  assert.equal(root.status, 308, "/ must redirect, not render");
  assert.equal(root.headers.get("location"), `/${defaultLanguage}`);

  // Pre-i18n article URLs keep working.
  const legacy = await request(
    `/articles/${samples[defaultLanguage].slug}`,
  );
  assert.equal(legacy.status, 308);
  assert.equal(
    legacy.headers.get("location"),
    `/${defaultLanguage}/articles/${samples[defaultLanguage].slug}`,
  );

  const unknown = await request("/fr");
  assert.equal(unknown.status, 404, "an unconfigured language must 404");
});

for (const lang of languages) {
  const article = samples[lang];

  test(`[${lang}] archive is server-rendered with full metadata`, async () => {
    const markup = await html(`/${lang}`);
    const markupHead = head(markup);

    assert.match(markup, new RegExp(`<html[^>]*lang="${lang}"`));
    assert.match(markupHead, /<title>[^<]+<\/title>/i);
    assert.match(
      markupHead,
      /<meta[^>]+name="description"[^>]+content="[^"]{50,}"/i,
      "archive needs a substantive meta description",
    );
    assert.match(
      markupHead,
      new RegExp(
        `<link[^>]+rel="canonical"[^>]+href="${escapeRegExp(site.url)}/${lang}"`,
        "i",
      ),
    );
    assert.match(markupHead, /<meta[^>]+property="og:title"/i);
    assert.match(markupHead, /<meta[^>]+name="twitter:card"/i);
    assert.match(markupHead, /<link[^>]+type="application\/rss\+xml"/i);

    // The archive itself must be in the HTML, not fetched client-side.
    assert.match(markup, new RegExp(escapeRegExp(article.title)));
    assert.match(markup, new RegExp(`href="/${lang}/articles/${article.slug}"`));

    const blocks = jsonLdBlocks(markup);
    assert.ok(findType(blocks, "WebSite"), "expected WebSite JSON-LD");
    assert.ok(findType(blocks, "Organization"), "expected Organization JSON-LD");

    const itemList = findType(blocks, "ItemList");
    assert.ok(itemList, "expected ItemList JSON-LD");
    assert.equal(itemList.itemListElement[0].position, 1);
    assert.match(itemList.itemListElement[0].url, new RegExp(`/${lang}/`));
  });

  test(`[${lang}] archive declares hreflang for every language`, async () => {
    const markupHead = head(await html(`/${lang}`));
    const tags = markupHead.match(/<link[^>]*hreflang="[^"]+"[^>]*>/gi) ?? [];

    // One per language plus x-default, and no duplicates.
    assert.equal(tags.length, languages.length + 1);
    for (const code of [...languages, "x-default"]) {
      assert.equal(
        tags.filter((tag) => new RegExp(`hreflang="${code}"`, "i").test(tag))
          .length,
        1,
        `expected exactly one hreflang="${code}"`,
      );
    }
    assert.match(
      tags.find((tag) => /hreflang="x-default"/i.test(tag)),
      new RegExp(`href="${escapeRegExp(site.url)}/${defaultLanguage}"`),
    );
  });

  test(`[${lang}] language switcher links to every language`, async () => {
    const markup = await html(`/${lang}`);
    assert.match(markup, /class="lang-switcher"/);

    for (const code of languages) {
      assert.match(markup, new RegExp(`href="/${code}"[^>]*hrefLang="${code}"`, "i"));
    }
    assert.match(
      markup,
      new RegExp(`class="lang-option is-current"[^>]*hrefLang="${lang}"`, "i"),
    );
  });

  test(`[${lang}] article renders its full body and metadata`, async () => {
    const markup = await html(`/${lang}/articles/${article.slug}`);
    const markupHead = head(markup);

    assert.match(markup, new RegExp(`<html[^>]*lang="${lang}"`));

    const headings = markup.match(/<h1\b/gi) ?? [];
    assert.equal(headings.length, 1, "an article page must have exactly one h1");

    assert.match(
      markupHead,
      new RegExp(
        `<meta[^>]+name="description"[^>]+content="${escapeRegExp(
          article.seo.metaDescription.slice(0, 40),
        )}`,
        "i",
      ),
    );
    assert.match(
      markupHead,
      new RegExp(
        `<link[^>]+rel="canonical"[^>]+href="[^"]*/${lang}/articles/${article.slug}"`,
        "i",
      ),
    );
    assert.match(markupHead, /<meta[^>]+property="article:published_time"/i);

    // Prose, section anchors, and FAQ answers all present without hydration.
    assert.match(markup, new RegExp(escapeRegExp(article.introduction.slice(0, 60))));
    for (const section of article.sections) {
      assert.match(markup, new RegExp(`id="${section.id}"`));
      assert.match(markup, new RegExp(escapeRegExp(section.heading)));
    }
    for (const faq of article.faqs) {
      assert.match(markup, new RegExp(escapeRegExp(faq.question)));
    }
    assert.match(markup, /aria-label="Breadcrumb|aria-label="Remah roti/);

    const blocks = jsonLdBlocks(markup);
    const jsonLd = findType(blocks, "Article");
    assert.ok(jsonLd, "expected Article JSON-LD");
    assert.equal(jsonLd.headline, article.title);
    assert.equal(jsonLd.inLanguage, lang);
    assert.equal(jsonLd.datePublished, article.publishedAt);
    assert.ok(jsonLd.publisher?.name, "Article JSON-LD needs a publisher");

    assert.ok(findType(blocks, "BreadcrumbList"), "expected BreadcrumbList");

    if (article.faqs.length > 0) {
      const faq = findType(blocks, "FAQPage");
      assert.ok(faq, "expected FAQPage JSON-LD");
      assert.equal(faq.mainEntity.length, article.faqs.length);
    }
  });

  test(`[${lang}] feed.xml is a valid RSS channel`, async () => {
    const response = await request(`/${lang}/feed.xml`, "application/rss+xml");
    assert.equal(response.status, 200);

    const xml = await response.text();
    assert.match(xml, /<rss version="2\.0"/);
    assert.match(xml, /<atom:link[^>]+rel="self"/);
    assert.match(xml, new RegExp(`<language>${lang}</language>`));
    assert.match(
      xml,
      new RegExp(`<title>${escapeRegExp(article.title)}</title>`),
    );
    assert.match(xml, /<guid isPermaLink="true">/);
  });
}

test("sitemap covers every language and article", async () => {
  const response = await request("/sitemap.xml", "application/xml");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /xml/i);

  const xml = await response.text();
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);

  for (const lang of languages) {
    assert.match(
      xml,
      new RegExp(`<loc>${escapeRegExp(site.url)}/${lang}</loc>`),
      `sitemap missing the ${lang} archive`,
    );
    assert.match(
      xml,
      new RegExp(
        `<loc>${escapeRegExp(site.url)}/${lang}/articles/${samples[lang].slug}</loc>`,
      ),
    );
  }

  // Archives cross-link via hreflang; articles deliberately do not.
  assert.match(xml, /xhtml:link rel="alternate" hreflang="x-default"/);
  assert.match(xml, /<lastmod>\d{4}-\d{2}-\d{2}T/);
});

test("robots.txt points crawlers at the sitemap", async () => {
  const response = await request("/robots.txt", "text/plain");
  assert.equal(response.status, 200);

  const body = await response.text();
  assert.match(body, /User-agent: \*/);
  assert.match(
    body,
    new RegExp(`Sitemap: ${escapeRegExp(site.url)}/sitemap\\.xml`),
  );
});

test("the JSON API serves each language", async () => {
  const grouped = await (await request("/api/articles", "application/json")).json();
  for (const lang of languages) {
    assert.ok(Array.isArray(grouped[lang]), `missing ${lang} in the API index`);
  }

  const single = await request(
    `/api/articles?lang=${defaultLanguage}`,
    "application/json",
  );
  assert.equal(single.status, 200);
  const summaries = await single.json();
  assert.ok(Array.isArray(summaries) && summaries.length > 0);

  // Newest first — the archive and sitemap both depend on this ordering.
  const dates = summaries.map((summary) => Date.parse(summary.publishedAt));
  assert.deepEqual(dates, [...dates].sort((a, b) => b - a));

  const unknown = await request("/api/articles?lang=fr", "application/json");
  assert.equal(unknown.status, 404);
});

test("drafts never reach the build", async () => {
  const manifest = await readFile(new URL("manifest.ts", contentUrl), "utf8");
  assert.doesNotMatch(
    manifest,
    /drafts\//,
    "the manifest must only import published articles",
  );

  for (const lang of languages) {
    for (const article of Object.values(samples)) {
      if (article.lang !== lang) continue;
      assert.equal(article.status, "published");
    }
  }
});
