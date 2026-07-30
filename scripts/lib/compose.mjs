/**
 * Turns a raw draft payload (from Claude, from the mock writer, or from an RSS
 * item) into the finished `Article` object the site renders.
 */
import { countWords, initials, readTime, slugify, truncate } from "./text.mjs";

/**
 * Copy the generator itself emits (RSS excerpts, placeholder drafts). Article
 * text written by Claude is localised by the prompt instead. Falls back to
 * English for languages that are not listed.
 */
const GENERATOR_STRINGS = {
  en: {
    summaryHeading: "What this covers",
    fromTheFeed: "From the feed",
    syndicated: (feed) =>
      `This is a syndicated summary. Read the full piece at ${feed}.`,
    reportedBy: (feed) => `Reported by ${feed}.`,
  },
  id: {
    summaryHeading: "Isi ringkasan ini",
    fromTheFeed: "Dari feed",
    syndicated: (feed) =>
      `Ini ringkasan sindikasi. Baca versi lengkapnya di ${feed}.`,
    reportedBy: (feed) => `Dilaporkan oleh ${feed}.`,
  },
};

function generatorStrings(lang) {
  const base = String(lang || "en").toLowerCase().split(/[-_]/)[0];
  return GENERATOR_STRINGS[base] ?? GENERATOR_STRINGS.en;
}

function pick(pool, index, fallback) {
  if (!pool || pool.length === 0) return fallback;
  return pool[index % pool.length];
}

function uniqueSlug(candidate, taken) {
  const base = slugify(candidate) || "article";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n += 1;
  return `${base}-${n}`;
}

function articleWordCount(payload) {
  const body = [
    payload.introduction,
    ...(payload.sections ?? []).flatMap((section) => section.paragraphs ?? []),
    ...(payload.faqs ?? []).map((faq) => faq.answer),
  ].join(" ");
  return countWords(body);
}

/** Section anchors must be unique — they are used as in-page `#hash` targets. */
function normaliseSections(sections) {
  const seen = new Set();
  return (sections ?? []).map((section, index) => {
    let id = slugify(section.id || section.heading) || `section-${index + 1}`;
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    return {
      id,
      kicker: section.kicker ?? `0${index + 1}`,
      heading: section.heading ?? "",
      paragraphs: (section.paragraphs ?? []).filter(Boolean),
    };
  });
}

export function composeArticle({
  payload,
  config,
  language,
  takenSlugs,
  imageIndex,
  publishedAt = new Date(),
  source,
  status = "draft",
}) {
  const slug = uniqueSlug(payload.slug || payload.title, takenSlugs);
  const words = articleWordCount(payload);
  const pool = config.generation.imagePool;
  const heroImage = pick(pool, imageIndex, "/og.png");
  const inlineImage = pick(pool, imageIndex + 1, heroImage);
  const iso = publishedAt.toISOString();

  const keywords = [
    ...new Set(
      [payload.focusKeyword, ...(payload.keywords ?? [])].filter(Boolean),
    ),
  ];

  return {
    slug,
    lang: language.code,
    status,
    category: payload.category || "Guide",
    title: payload.title,
    deck: payload.deck ?? "",
    heroImage,
    heroImageAlt: payload.heroImageAlt || payload.title,
    publishedAt: iso,
    updatedAt: iso,
    readTime: readTime(words),
    wordCount: words,
    author: {
      name: language.author.name,
      role: language.author.role,
      initials: initials(language.author.name),
    },
    seo: {
      metaTitle: truncate(payload.metaTitle || payload.title, 60),
      metaDescription: truncate(
        payload.metaDescription || payload.deck || "",
        158,
      ),
      focusKeyword: payload.focusKeyword ?? keywords[0] ?? "",
      keywords,
    },
    introduction: payload.introduction ?? "",
    sections: normaliseSections(payload.sections),
    quote: payload.quote ?? { text: "", attribution: config.site.name },
    inlineImage: {
      src: inlineImage,
      alt: payload.inlineImageAlt || payload.title,
      caption: payload.inlineImageCaption ?? "",
    },
    checklist: (payload.checklist ?? []).filter(Boolean),
    faqs: (payload.faqs ?? []).filter((faq) => faq?.question && faq?.answer),
    backlink: {
      label: language.cta.label,
      title: language.cta.title,
      description: language.cta.description,
      href: language.cta.href,
    },
    source: source ?? { type: "ai" },
  };
}

/**
 * Fallback writer used when ANTHROPIC_API_KEY is unset. Produces a complete,
 * structurally valid draft so the whole pipeline — build, routes, sitemap,
 * structured data, the review panel — can be exercised without an API key.
 * The copy is openly marked as a placeholder so it can never be mistaken for
 * publishable work.
 */
export function mockPayload(config, language, brief) {
  const keyword = brief.focusKeyword;
  const note =
    "PLACEHOLDER COPY — drafted without an API key. Set ANTHROPIC_API_KEY in .env and regenerate before publishing.";

  const section = (n, kicker, heading) => ({
    id: slugify(heading),
    kicker: `0${n} — ${kicker}`,
    heading,
    paragraphs: [
      `${note} This section would cover ${heading.toLowerCase()} in the context of ${keyword}, written for ${language.audience}.`,
      `The finished article devotes roughly ${Math.round(config.generation.wordCount / 5)} words here, with concrete, decision-useful detail rather than generalities.`,
    ],
  });

  return {
    title: `${keyword.replace(/\b\w/g, (c) => c.toUpperCase())}: a practical guide`,
    slug: slugify(keyword),
    category: "Placeholder",
    deck: `${note} A working draft covering ${keyword} for ${language.audience}.`,
    metaTitle: truncate(`${keyword} — a practical guide`, 60),
    metaDescription: truncate(
      `Placeholder meta description for ${keyword}. Set ANTHROPIC_API_KEY and regenerate to replace this with real copy.`,
      158,
    ),
    focusKeyword: keyword,
    keywords: [keyword, ...brief.supportingKeywords].slice(0, 8),
    heroImageAlt: `Placeholder hero image for an article about ${keyword}`,
    introduction: `${note} The real introduction states the reader's problem and what this page settles about ${keyword}.`,
    sections: [
      section(1, "Start here", "Where to begin"),
      section(2, "Look closely", "What to check before you commit"),
      section(3, "The human detail", "Who you are actually dealing with"),
      section(4, "Before you confirm", "Getting the total picture"),
    ],
    quote: {
      text: "Placeholder pull quote — replace by regenerating with an API key.",
      attribution: config.site.name,
    },
    inlineImageAlt: `Placeholder supporting image for ${keyword}`,
    inlineImageCaption: note,
    checklist: [
      "Placeholder checklist item one",
      "Placeholder checklist item two",
      "Placeholder checklist item three",
      "Placeholder checklist item four",
      "Placeholder checklist item five",
    ],
    faqs: [
      {
        question: `What is the short answer about ${keyword}?`,
        answer: `${note} The real answer is 40–70 words and stands alone, because it is rendered as FAQPage structured data.`,
      },
      {
        question: "How do I replace this placeholder content?",
        answer:
          "Add ANTHROPIC_API_KEY to your .env file and regenerate the draft from the review panel. Every placeholder is rewritten with real, original copy.",
      },
    ],
  };
}

/**
 * Builds an attributed excerpt entry for CONTENT_SOURCE=rss. We publish a
 * short summary plus a prominent link to the original rather than
 * republishing a publisher's article text.
 */
export function rssPayload(config, language, item, brief) {
  const summary = item.summary || item.title;
  const strings = generatorStrings(language.code);

  return {
    title: item.title,
    slug: slugify(item.title),
    category: item.feedTitle,
    deck: truncate(summary, 180),
    metaTitle: truncate(item.title, 60),
    metaDescription: truncate(summary, 158),
    focusKeyword: brief.focusKeyword,
    keywords: [brief.focusKeyword, ...brief.supportingKeywords].slice(0, 8),
    heroImageAlt: item.title,
    introduction: truncate(summary, 320),
    sections: [
      {
        id: "summary",
        kicker: strings.fromTheFeed,
        heading: strings.summaryHeading,
        paragraphs: [truncate(summary, 400), strings.syndicated(item.feedTitle)],
      },
    ],
    quote: { text: "", attribution: item.feedTitle },
    inlineImageAlt: item.title,
    inlineImageCaption: strings.reportedBy(item.feedTitle),
    checklist: [],
    faqs: [],
  };
}
