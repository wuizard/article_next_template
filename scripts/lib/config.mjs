/**
 * Reads `.env` and turns it into the config the generator, the admin panel,
 * and the rendered site all share. Runs on the server only — nothing here
 * ships to the browser.
 *
 * Per-language settings use a `_<LANG>` suffix and fall back to the
 * unsuffixed key, so `CONTENT_KEYWORDS_ID` overrides `CONTENT_KEYWORDS` for
 * Indonesian while other languages keep the shared value.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Loads `.env` into process.env without adding a dependency. Node >= 21.7. */
export function loadEnvFile(path = `${ROOT}.env`) {
  if (!existsSync(path)) return false;
  process.loadEnvFile(path);
  return true;
}

function raw(key) {
  const value = process.env[key];
  return value === undefined || value === "" ? undefined : value.trim();
}

/** Reads `KEY_<LANG>` first, then `KEY`, then the fallback. */
function str(key, lang, fallback = "") {
  const suffixed = lang ? raw(`${key}_${lang.toUpperCase()}`) : undefined;
  return suffixed ?? raw(key) ?? fallback;
}

function bool(key, fallback) {
  const value = raw(key);
  if (value === undefined) return fallback;
  return !["false", "0", "no", "off"].includes(value.toLowerCase());
}

function int(key, fallback) {
  const parsed = Number.parseInt(raw(key) ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** Splits on commas and newlines, trims, and drops empties. */
function list(key, lang, fallback = []) {
  const value = str(key, lang);
  if (!value) return fallback;
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const VALID_SOURCES = new Set(["ai", "rss", "hybrid"]);

/** Defaults so a two-line `.env` still produces sane output. */
const LANGUAGE_DEFAULTS = {
  en: { label: "English", locale: "en_US", promptName: "English" },
  id: {
    label: "Bahasa Indonesia",
    locale: "id_ID",
    promptName: "Bahasa Indonesia",
  },
  ms: { label: "Bahasa Melayu", locale: "ms_MY", promptName: "Bahasa Melayu" },
  nl: { label: "Nederlands", locale: "nl_NL", promptName: "Nederlands" },
  de: { label: "Deutsch", locale: "de_DE", promptName: "Deutsch" },
  fr: { label: "Français", locale: "fr_FR", promptName: "Français" },
  es: { label: "Español", locale: "es_ES", promptName: "Español" },
  ja: { label: "日本語", locale: "ja_JP", promptName: "日本語" },
  zh: { label: "中文", locale: "zh_CN", promptName: "中文" },
};

function readLanguage(code, siteUrl) {
  const defaults = LANGUAGE_DEFAULTS[code] ?? {
    label: code.toUpperCase(),
    locale: code,
    promptName: code,
  };

  return {
    code,
    label: str("SITE_LANGUAGE_LABEL", code, defaults.label),
    locale: str("SITE_LOCALE", code, defaults.locale),
    tagline: str("SITE_TAGLINE", code),
    edition: str("SITE_EDITION", code),
    description: str("SITE_DESCRIPTION", code),

    topic: str("CONTENT_TOPIC", code, "Travel"),
    audience: str("CONTENT_AUDIENCE", code, "General readers"),
    tone: str("CONTENT_TONE", code, "Warm, precise, editorial."),
    /** Language name used in the writing prompt. */
    promptName: str("CONTENT_LANGUAGE", code, defaults.promptName),
    keywords: list("CONTENT_KEYWORDS", code),
    longtail: list("CONTENT_LONGTAIL", code),
    author: {
      name: str("CONTENT_AUTHOR_NAME", code, "Editorial team"),
      role: str("CONTENT_AUTHOR_ROLE", code, "Editor"),
    },

    feeds: list("RSS_FEEDS", code),
    requireTerms: list("RSS_REQUIRE_TERMS", code).map((term) =>
      term.toLowerCase(),
    ),

    cta: {
      label: str("CTA_LABEL", code, "Recommended resource"),
      title: str("CTA_TITLE", code, str("BRAND_NAME", null, "Visit our site")),
      description: str("CTA_DESCRIPTION", code),
      href: str("CTA_HREF", code, str("BRAND_URL", null, siteUrl)),
    },
  };
}

export function readConfig() {
  const source = (raw("CONTENT_SOURCE") ?? "hybrid").toLowerCase();
  if (!VALID_SOURCES.has(source)) {
    throw new Error(
      `CONTENT_SOURCE must be one of ai | rss | hybrid (got "${source}").`,
    );
  }

  const siteUrl = (raw("SITE_URL") ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );

  const codes = list("SITE_LANGUAGES", null, ["en"]).map((code) =>
    code.toLowerCase(),
  );
  if (codes.length === 0) {
    throw new Error("SITE_LANGUAGES must list at least one language code.");
  }

  const defaultLanguage = (raw("SITE_DEFAULT_LANGUAGE") ?? codes[0])
    .toLowerCase();
  if (!codes.includes(defaultLanguage)) {
    throw new Error(
      `SITE_DEFAULT_LANGUAGE="${defaultLanguage}" is not in SITE_LANGUAGES (${codes.join(", ")}).`,
    );
  }

  const languages = Object.fromEntries(
    codes.map((code) => [code, readLanguage(code, siteUrl)]),
  );

  if (source !== "ai") {
    const missing = codes.filter((code) => languages[code].feeds.length === 0);
    if (missing.length === codes.length) {
      throw new Error(
        `CONTENT_SOURCE="${source}" needs feeds. Set RSS_FEEDS, or RSS_FEEDS_${codes[0].toUpperCase()} per language.`,
      );
    }
  }

  return {
    site: {
      url: siteUrl,
      name: str("SITE_NAME", null, "The Local Edit"),
      indexable: bool("SEO_INDEXABLE", true),
      /** Syndicated RSS excerpt pages carry noindex when true. */
      itemNoindex: bool("RSS_ITEM_NOINDEX", false),
      twitterHandle: str("TWITTER_HANDLE", null),
      defaultLanguage,
      codes,
    },
    brand: {
      name: str("BRAND_NAME", null, str("SITE_NAME", null, "The Local Edit")),
      url: str("BRAND_URL", null, siteUrl),
      logo: str("BRAND_LOGO", null, "/favicon.svg"),
    },
    generation: {
      source,
      wordCount: int("CONTENT_WORD_COUNT", 2000),
      articlesPerRun: Math.max(0, int("CONTENT_ARTICLES_PER_RUN", 1)),
      maxArticles: Math.max(0, int("CONTENT_MAX_ARTICLES", 0)),
      imagePool: list("CONTENT_IMAGE_POOL", null),
      rssMaxAgeDays: int("RSS_MAX_AGE_DAYS", 30),
    },
    ai: {
      apiKey: raw("ANTHROPIC_API_KEY") ?? "",
      model: str("CONTENT_MODEL", null, "claude-sonnet-5"),
      effort: str("CONTENT_EFFORT", null, "medium"),
    },
    languages,
  };
}

/**
 * The subset of config the rendered site needs. Written to `content/site.json`
 * so pages read baked data instead of reaching for `process.env` at runtime.
 */
export function toSiteManifest(config) {
  return {
    url: config.site.url,
    name: config.site.name,
    indexable: config.site.indexable,
    itemNoindex: config.site.itemNoindex,
    twitterHandle: config.site.twitterHandle,
    defaultLanguage: config.site.defaultLanguage,
    brand: config.brand,
    languages: config.site.codes.map((code) => {
      const language = config.languages[code];
      return {
        code,
        label: language.label,
        locale: language.locale,
        tagline: language.tagline,
        edition: language.edition,
        description: language.description,
        topic: language.topic,
        keywords: language.keywords,
        cta: language.cta,
      };
    }),
    generatedAt: new Date().toISOString(),
  };
}
