/**
 * Minimal RSS 2.0 + Atom reader. Deliberately dependency-free: it only needs
 * to pull title/link/date/summary out of well-formed feeds at build time.
 */
import { decodeEntities, stripHtml, truncate } from "./text.mjs";

function firstTag(xml, ...names) {
  for (const name of names) {
    const cdata = xml.match(
      new RegExp(`<${name}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`, "i"),
    );
    if (cdata) return decodeEntities(cdata[1]).trim();

    const plain = xml.match(
      new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"),
    );
    if (plain) return decodeEntities(plain[1]).trim();

    // Atom <link href="..."/> has no text body.
    const attr = xml.match(
      new RegExp(`<${name}[^>]*\\bhref=["']([^"']+)["'][^>]*/?>`, "i"),
    );
    if (attr) return decodeEntities(attr[1]).trim();
  }
  return "";
}

function splitItems(xml) {
  const items = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi)].map(
    (match) => match[0],
  );
  if (items.length > 0) return items;
  return [...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map(
    (match) => match[0],
  );
}

async function fetchFeed(url, signal) {
  const response = await fetch(url, {
    signal,
    headers: {
      // Some feeds 403 an empty UA.
      "user-agent": "LocalBaliVillasJournal/1.0 (+static site generator)",
      accept: "application/rss+xml, application/atom+xml, application/xml, text/xml",
    },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function parseFeed(xml, feedUrl) {
  const channel = xml.split(/<item[\s>]|<entry[\s>]/i)[0] ?? "";
  const feedTitle = firstTag(channel, "title") || new URL(feedUrl).hostname;

  return splitItems(xml).map((raw) => {
    const summaryRaw = firstTag(
      raw,
      "description",
      "summary",
      "content:encoded",
      "content",
    );
    const dateRaw = firstTag(raw, "pubDate", "published", "updated", "dc:date");
    const published = dateRaw ? new Date(dateRaw) : null;

    return {
      feedTitle,
      feedUrl,
      title: stripHtml(firstTag(raw, "title")),
      link: firstTag(raw, "link", "guid"),
      // Kept short on purpose: we attribute and link out rather than
      // republishing a publisher's full text.
      summary: truncate(stripHtml(summaryRaw), 400),
      publishedAt:
        published && !Number.isNaN(published.valueOf()) ? published : null,
    };
  });
}

/**
 * Fetches every configured feed, filters by age and required terms, and
 * returns items newest-first. A failing feed logs and is skipped — one dead
 * feed must not break the daily build.
 */
export async function collectFeedItems(rssConfig, { log = console.log } = {}) {
  const items = [];

  for (const url of rssConfig.feeds) {
    try {
      const xml = await fetchFeed(url, AbortSignal.timeout(20_000));
      const parsed = parseFeed(xml, url).filter((item) => item.title && item.link);
      log(`  feed ok    ${url} — ${parsed.length} item(s)`);
      items.push(...parsed);
    } catch (error) {
      log(`  feed FAIL  ${url} — ${error.message}`);
    }
  }

  const cutoff =
    rssConfig.maxAgeDays > 0
      ? Date.now() - rssConfig.maxAgeDays * 86_400_000
      : null;

  const filtered = items.filter((item) => {
    if (cutoff && item.publishedAt && item.publishedAt.valueOf() < cutoff) {
      return false;
    }
    if (rssConfig.requireTerms.length === 0) return true;
    const haystack = `${item.title} ${item.summary}`.toLowerCase();
    return rssConfig.requireTerms.some((term) => haystack.includes(term));
  });

  filtered.sort(
    (a, b) => (b.publishedAt?.valueOf() ?? 0) - (a.publishedAt?.valueOf() ?? 0),
  );

  // De-duplicate on link — feeds overlap more often than you'd think.
  const seen = new Set();
  return filtered.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}
