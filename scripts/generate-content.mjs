#!/usr/bin/env node
/**
 * Draft generator.
 *
 * Reads `.env`, produces one draft per language from the configured source
 * (Claude, RSS, or both), and writes it to `content/drafts/<lang>/`. Drafts are
 * never rendered — approve them in the review panel (`npm run review`) to move
 * them into `content/articles/<lang>/`.
 *
 *   npm run generate                  # one draft per language
 *   npm run generate -- --count=3     # three per language
 *   npm run generate -- --lang=id     # only Indonesian
 *   npm run generate -- --publish     # skip review, publish immediately
 *   npm run generate -- --sync        # refresh site.json + manifest only
 *   npm run generate -- --dry-run     # show the plan, write nothing
 */
import { loadEnvFile, readConfig } from "./lib/config.mjs";
import { collectFeedItems } from "./lib/rss.mjs";
import { composeArticle, mockPayload, rssPayload } from "./lib/compose.mjs";
import { createWriter } from "./lib/ai.mjs";
import {
  ensureDirs,
  readLanguage,
  writeArticle,
  writeManifest,
  writeSiteManifest,
} from "./lib/store.mjs";

const argv = process.argv.slice(2);
const has = (flag) => argv.includes(flag);
const value = (name) => {
  const match = argv.find((arg) => arg.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : undefined;
};

const SYNC_ONLY = has("--sync");
const DRY_RUN = has("--dry-run");
const PUBLISH = has("--publish");

const log = (...args) => console.log(...args);

/**
 * Assigns each new draft a focus keyword. Keywords with no article yet come
 * first, so a daily run works through the keyword list before doubling up.
 */
function buildBriefs(config, language, existing, count, feedItems) {
  const keywords = language.keywords.length
    ? language.keywords
    : [language.topic];

  const used = new Set(
    existing.map((article) => article.seo?.focusKeyword).filter(Boolean),
  );
  const queue = [...keywords.filter((k) => !used.has(k)), ...keywords];

  return Array.from({ length: count }, (_, index) => {
    const focusKeyword = queue[index % queue.length];
    // Give each brief its own slice of the feed so two drafts in one run
    // aren't written from identical signal.
    const sourceItems =
      config.generation.source === "hybrid"
        ? feedItems.slice(index * 3, index * 3 + 3)
        : [];

    return {
      language,
      focusKeyword,
      supportingKeywords: keywords
        .filter((keyword) => keyword !== focusKeyword)
        .slice(0, 5),
      sourceItems,
      angle: sourceItems.length
        ? "Anchor the piece in what travellers are asking about right now, but keep it evergreen."
        : "",
    };
  });
}

async function generateForLanguage(config, language, writer, count) {
  const kind = PUBLISH ? "articles" : "drafts";
  const [published, drafts] = await Promise.all([
    readLanguage("articles", language.code),
    readLanguage("drafts", language.code),
  ]);

  const taken = new Set(
    [...published, ...drafts].map((article) => article.slug),
  );
  const existingTitles = [...published, ...drafts].map(
    (article) => article.title,
  );

  let feedItems = [];
  if (config.generation.source !== "ai" && count > 0) {
    if (language.feeds.length === 0) {
      log(`  [${language.code}] no feeds configured — skipping feed fetch`);
    } else {
      log(`  [${language.code}] fetching ${language.feeds.length} feed(s)…`);
      feedItems = await collectFeedItems(
        {
          feeds: language.feeds,
          maxAgeDays: config.generation.rssMaxAgeDays,
          requireTerms: language.requireTerms,
        },
        { log: (line) => log(`  [${language.code}] ${line.trim()}`) },
      );
      log(`  [${language.code}] ${feedItems.length} usable item(s)`);
    }
  }

  const briefs = buildBriefs(config, language, published, count, feedItems);

  if (DRY_RUN) {
    briefs.forEach((brief, index) => {
      log(`    ${language.code} ${index + 1}. focus "${brief.focusKeyword}"`);
      brief.sourceItems.forEach((item) =>
        log(`         signal: ${item.title.slice(0, 70)}`),
      );
    });
    return [];
  }

  const written = [];

  for (const [index, brief] of briefs.entries()) {
    let payload;
    let source = { type: "ai" };

    if (config.generation.source === "rss") {
      const item = feedItems[index];
      if (!item) break;
      payload = rssPayload(config, language, item, brief);
      source = {
        type: "rss",
        feedTitle: item.feedTitle,
        originalUrl: item.link,
        originalTitle: item.title,
      };
    } else if (writer) {
      log(
        `  [${language.code}] drafting ${index + 1}/${briefs.length}: "${brief.focusKeyword}"…`,
      );
      payload = await writer.write(brief, [
        ...existingTitles,
        ...written.map((article) => article.title),
      ]);
      if (brief.sourceItems.length) {
        source = {
          type: "ai",
          informedBy: brief.sourceItems.map((item) => item.feedTitle),
        };
      }
    } else {
      payload = mockPayload(config, language, brief);
      source = { type: "mock" };
    }

    const article = composeArticle({
      payload,
      config,
      language,
      takenSlugs: taken,
      imageIndex: published.length + index,
      source,
      status: PUBLISH ? "published" : "draft",
    });

    taken.add(article.slug);
    await writeArticle(kind, article);
    written.push(article);
    log(
      `  [${language.code}] ✓ ${kind}/${article.slug} — ${article.wordCount} words · backlink ${article.backlink.href}`,
    );
  }

  return written;
}

async function main() {
  const hasEnv = loadEnvFile();
  const config = readConfig();

  const onlyLang = value("lang");
  if (onlyLang && !config.site.codes.includes(onlyLang)) {
    throw new Error(
      `--lang=${onlyLang} is not in SITE_LANGUAGES (${config.site.codes.join(", ")}).`,
    );
  }
  const codes = onlyLang ? [onlyLang] : config.site.codes;

  log(`\n${config.site.name} — content generator`);
  log(`  env file   ${hasEnv ? ".env" : "not found (using defaults)"}`);
  log(`  source     ${config.generation.source}`);
  log(`  languages  ${codes.join(", ")} (default ${config.site.defaultLanguage})`);
  log(`  site url   ${config.site.url}`);
  log(`  target     ${PUBLISH ? "published (review skipped)" : "drafts"}`);

  await ensureDirs(config.site.codes);

  const requested = Number.parseInt(value("count") ?? "", 10);
  const count = SYNC_ONLY
    ? 0
    : Number.isFinite(requested)
      ? requested
      : config.generation.articlesPerRun;

  const usingAi = config.generation.source !== "rss";
  const hasKey = Boolean(config.ai.apiKey);

  if (usingAi && !hasKey && count > 0) {
    log(
      "\n  ⚠ ANTHROPIC_API_KEY is not set — running in MOCK mode.\n" +
        "    Placeholder drafts will be written so you can exercise the review\n" +
        "    panel and the build. Add the key and regenerate before publishing.",
    );
  }
  if (usingAi && hasKey && count > 0) {
    log(`  model      ${config.ai.model} (effort ${config.ai.effort})`);
  }

  const writer = usingAi && hasKey && count > 0 ? createWriter(config) : null;

  if (DRY_RUN) log("\n  Plan (--dry-run, nothing written):");

  let total = 0;
  for (const code of codes) {
    const written = await generateForLanguage(
      config,
      config.languages[code],
      writer,
      count,
    );
    total += written.length;
  }

  if (DRY_RUN) {
    log("");
    return;
  }

  if (hasEnv) {
    await writeSiteManifest(config, { log });
  } else {
    log("  (no .env — keeping the existing content/site.json)");
  }

  const counts = await writeManifest(config);
  const summary = Object.entries(counts)
    .map(([lang, n]) => `${lang}:${n}`)
    .join("  ");

  log(
    `\n  Wrote ${total} ${PUBLISH ? "article" : "draft"}(s). Published index: ${summary}`,
  );
  if (writer) log(`  API usage: ${writer.formatSpend()}`);
  if (!PUBLISH && total > 0) {
    log("  Review them with `npm run review`, then approve to publish.\n");
  } else {
    log("");
  }
}

main().catch((error) => {
  console.error(`\n  Generation failed: ${error.message}\n`);
  process.exitCode = 1;
});
