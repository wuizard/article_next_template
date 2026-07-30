/**
 * The content store: everything that reads or writes `content/` goes through
 * here, so the generator and the admin panel can never drift apart.
 *
 * Layout:
 *   content/site.json                  site + language config, from .env
 *   content/drafts/<lang>/<slug>.json  awaiting review, never rendered
 *   content/articles/<lang>/<slug>.json published
 *   content/manifest.ts                auto-generated typed index
 */
import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, rename, rm, writeFile } from "node:fs/promises";
import { ROOT, toSiteManifest } from "./config.mjs";

export const CONTENT_DIR = `${ROOT}content`;
export const KINDS = /** @type {const} */ (["drafts", "articles"]);

export function kindDir(kind) {
  return `${CONTENT_DIR}/${kind}`;
}

export function langDir(kind, lang) {
  return `${kindDir(kind)}/${lang}`;
}

export function articlePath(kind, lang, slug) {
  return `${langDir(kind, lang)}/${slug}.json`;
}

async function readJsonDir(dir) {
  if (!existsSync(dir)) return [];
  const files = (await readdir(dir)).filter((name) => name.endsWith(".json"));
  return Promise.all(
    files.map(async (name) => JSON.parse(await readFile(`${dir}/${name}`, "utf8"))),
  );
}

const byNewest = (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt);

/** All articles of one kind for one language, newest first. */
export async function readLanguage(kind, lang) {
  return (await readJsonDir(langDir(kind, lang))).sort(byNewest);
}

/** `{ [lang]: Article[] }` for every configured language. */
export async function readAll(kind, codes) {
  const entries = await Promise.all(
    codes.map(async (lang) => [lang, await readLanguage(kind, lang)]),
  );
  return Object.fromEntries(entries);
}

export async function readOne(kind, lang, slug) {
  const path = articlePath(kind, lang, slug);
  if (!existsSync(path)) return null;
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeArticle(kind, article) {
  await mkdir(langDir(kind, article.lang), { recursive: true });
  await writeFile(
    articlePath(kind, article.lang, article.slug),
    `${JSON.stringify(article, null, 2)}\n`,
    "utf8",
  );
}

export async function deleteArticle(kind, lang, slug) {
  await rm(articlePath(kind, lang, slug), { force: true });
}

/**
 * Approve: move a draft into the published set and stamp it. The published
 * date becomes the approval date, so the archive reflects when readers could
 * actually see it.
 */
export async function publishDraft(lang, slug, { patch } = {}) {
  const draft = await readOne("drafts", lang, slug);
  if (!draft) throw new Error(`No draft ${lang}/${slug}.`);

  const now = new Date().toISOString();
  const article = {
    ...draft,
    ...patch,
    lang,
    slug,
    status: "published",
    publishedAt: now,
    updatedAt: now,
  };

  await writeArticle("articles", article);
  await deleteArticle("drafts", lang, slug);
  return article;
}

/** Deletes article files that are no longer part of the archive. */
export async function pruneOrphans(kind, lang, keepSlugs) {
  const dir = langDir(kind, lang);
  if (!existsSync(dir)) return [];

  const orphans = (await readdir(dir))
    .filter((name) => name.endsWith(".json"))
    .filter((name) => !keepSlugs.has(name.replace(/\.json$/, "")));

  await Promise.all(orphans.map((name) => rm(`${dir}/${name}`, { force: true })));
  return orphans;
}

/**
 * Writes site.json, keeping the existing `generatedAt` when nothing else
 * changed — otherwise every scheduled run would produce a no-op commit.
 */
export async function writeSiteManifest(config, { log } = {}) {
  const path = `${CONTENT_DIR}/site.json`;
  const next = toSiteManifest(config);

  if (existsSync(path)) {
    const current = JSON.parse(await readFile(path, "utf8"));
    const withoutTimestamp = (manifest) => {
      const copy = { ...manifest };
      delete copy.generatedAt;
      return JSON.stringify(copy);
    };
    if (withoutTimestamp(next) === withoutTimestamp(current)) {
      log?.("  site.json unchanged");
      return false;
    }
  }

  await mkdir(CONTENT_DIR, { recursive: true });
  await writeFile(path, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return true;
}

/**
 * The manifest is a plain TypeScript module with static imports, so the
 * bundler can pre-render it and `tsc` type-checks every published article
 * against the `Article` interface. Drafts are deliberately absent — they can
 * never leak into a build.
 */
export async function writeManifest(config) {
  const published = await readAll("articles", config.site.codes);

  const imports = [];
  const groups = [];
  let index = 0;

  for (const lang of config.site.codes) {
    const articles = published[lang] ?? [];
    const limit = config.generation.maxArticles;
    const kept = limit > 0 ? articles.slice(0, limit) : articles;
    const names = [];

    for (const article of kept) {
      const name = `a${index++}`;
      imports.push(
        `import ${name} from "./articles/${lang}/${article.slug}.json";`,
      );
      names.push(name);
    }
    groups.push({ lang, names });
  }

  const body = `// AUTO-GENERATED by \`npm run generate\`. Do not edit by hand.
// Source of truth: .env + content/articles/**/*.json
import type { Article } from "@/features/articles/types/article";
import type { SiteConfig } from "@/features/articles/types/site";

import site from "./site.json";
${imports.join("\n")}

export const siteConfig: SiteConfig = site;

/** Published articles per language code, newest first. */
export const articlesByLanguage: Record<string, Article[]> = {
${groups
  .map(
    ({ lang, names }) =>
      `  ${JSON.stringify(lang)}: [${names.length ? `\n${names.map((n) => `    ${n},`).join("\n")}\n  ` : ""}],`,
  )
  .join("\n")}
};
`;

  await mkdir(CONTENT_DIR, { recursive: true });
  await writeFile(`${CONTENT_DIR}/manifest.ts`, body, "utf8");

  return Object.fromEntries(
    groups.map(({ lang, names }) => [lang, names.length]),
  );
}

/** Ensures every configured language has its directories. */
export async function ensureDirs(codes) {
  await Promise.all(
    KINDS.flatMap((kind) =>
      codes.map((lang) => mkdir(langDir(kind, lang), { recursive: true })),
    ),
  );
}

export { rename };
