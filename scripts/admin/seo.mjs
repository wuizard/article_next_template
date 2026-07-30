/**
 * The checks the review panel runs against a draft before you approve it.
 *
 * These are the mechanical things that are easy to get wrong and easy to
 * verify. They do not tell you whether the piece is any good — that is what
 * reading it is for.
 */
import { countWords } from "../lib/text.mjs";

const PLACEHOLDER = /PLACEHOLDER COPY|Placeholder (meta|checklist|pull|hero|supporting)/i;

function bodyText(article) {
  return [
    article.introduction,
    ...article.sections.flatMap((section) => section.paragraphs),
    ...article.faqs.map((faq) => `${faq.question} ${faq.answer}`),
    ...article.checklist,
  ].join(" ");
}

function includesKeyword(haystack, keyword) {
  if (!keyword) return false;
  return haystack.toLowerCase().includes(keyword.toLowerCase());
}

/**
 * @returns {{level: "pass"|"warn"|"fail", label: string, detail: string}[]}
 */
export function auditDraft(article, { published = [], targetWords = 2000 } = {}) {
  const checks = [];
  const add = (level, label, detail) => checks.push({ level, label, detail });

  const keyword = article.seo.focusKeyword;
  const body = bodyText(article);
  const words = countWords(body);

  // --- Placeholder / mock content -----------------------------------------
  if (PLACEHOLDER.test(body) || PLACEHOLDER.test(article.deck)) {
    add(
      "fail",
      "Placeholder copy",
      "This draft was generated without an API key. Regenerate it before approving.",
    );
  }

  // --- Title ---------------------------------------------------------------
  const titleLength = article.title.length;
  add(
    titleLength >= 30 && titleLength <= 65 ? "pass" : "warn",
    "Headline length",
    `${titleLength} characters (aim for 30–65 so it isn't truncated in results).`,
  );

  const metaTitleLength = article.seo.metaTitle.length;
  add(
    metaTitleLength > 0 && metaTitleLength <= 60 ? "pass" : "fail",
    "Meta title length",
    `${metaTitleLength} characters (must be 1–60).`,
  );

  // --- Meta description ----------------------------------------------------
  const descriptionLength = article.seo.metaDescription.length;
  add(
    descriptionLength >= 120 && descriptionLength <= 158
      ? "pass"
      : descriptionLength === 0
        ? "fail"
        : "warn",
    "Meta description length",
    `${descriptionLength} characters (aim for 120–158).`,
  );

  // --- Focus keyword placement --------------------------------------------
  if (!keyword) {
    add("fail", "Focus keyword", "No focus keyword set.");
  } else {
    const inHeading = article.sections.some((section) =>
      includesKeyword(section.heading, keyword),
    );
    const placements = [
      ["headline", includesKeyword(article.title, keyword)],
      ["meta description", includesKeyword(article.seo.metaDescription, keyword)],
      ["opening paragraph", includesKeyword(article.introduction, keyword)],
      ["a section heading", inHeading],
    ];
    const missing = placements.filter(([, ok]) => !ok).map(([where]) => where);

    add(
      missing.length === 0 ? "pass" : missing.length > 2 ? "fail" : "warn",
      `Focus keyword: “${keyword}”`,
      missing.length === 0
        ? "Present in the headline, meta description, opening and a heading."
        : `Missing from ${missing.join(", ")}.`,
    );

    // Density above ~3% reads as stuffing to both people and crawlers.
    const occurrences = (
      body.toLowerCase().match(new RegExp(escapeRegExp(keyword.toLowerCase()), "g")) ?? []
    ).length;
    const density = words > 0 ? (occurrences * countWords(keyword)) / words : 0;
    if (density > 0.03) {
      add(
        "warn",
        "Keyword density",
        `${(density * 100).toFixed(1)}% — this reads as stuffing. Rewrite some mentions.`,
      );
    }
  }

  // --- Length --------------------------------------------------------------
  // Only a hard fail when the output is broken rather than merely short — a
  // failing check blocks approval, and length is the reviewer's judgement.
  const ratio = targetWords > 0 ? words / targetWords : 1;
  add(
    words < 400 ? "fail" : ratio >= 0.7 ? "pass" : "warn",
    "Length",
    words < 400
      ? `${words} words — the draft looks truncated.`
      : `${words} words against a ${targetWords}-word target.`,
  );

  // --- Structure -----------------------------------------------------------
  add(
    article.sections.length >= 3 ? "pass" : "warn",
    "Sections",
    `${article.sections.length} H2 sections (aim for 4–6).`,
  );

  add(
    article.faqs.length >= 3 ? "pass" : "warn",
    "FAQ entries",
    article.faqs.length === 0
      ? "None — the page will not be eligible for FAQ rich results."
      : `${article.faqs.length} questions, rendered as FAQPage structured data.`,
  );

  add(
    article.checklist.length >= 4 ? "pass" : "warn",
    "Checklist",
    `${article.checklist.length} items.`,
  );

  const thinSections = article.sections.filter(
    (section) => countWords(section.paragraphs.join(" ")) < 60,
  );
  if (thinSections.length > 0) {
    add(
      "warn",
      "Thin sections",
      `${thinSections.map((section) => `“${section.heading}”`).join(", ")} run short.`,
    );
  }

  // --- Slug ----------------------------------------------------------------
  const slugOk = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(article.slug);
  add(
    slugOk && article.slug.length <= 70 ? "pass" : "fail",
    "Slug",
    `/${article.lang}/articles/${article.slug}`,
  );

  // --- Duplication against what is already live ---------------------------
  const clashSlug = published.find((entry) => entry.slug === article.slug);
  if (clashSlug) {
    add("fail", "Duplicate slug", `Already published as “${clashSlug.title}”.`);
  }

  const clashKeyword = published.find(
    (entry) => entry.seo?.focusKeyword === keyword,
  );
  if (clashKeyword) {
    add(
      "warn",
      "Keyword already covered",
      `“${clashKeyword.title}” already targets this term — they will compete with each other.`,
    );
  }

  // --- Images --------------------------------------------------------------
  add(
    article.heroImageAlt && article.heroImageAlt.length <= 125 ? "pass" : "warn",
    "Hero image alt text",
    article.heroImageAlt
      ? `${article.heroImageAlt.length} characters.`
      : "Missing.",
  );

  return checks;
}

export function auditSummary(checks) {
  return {
    fail: checks.filter((check) => check.level === "fail").length,
    warn: checks.filter((check) => check.level === "warn").length,
    pass: checks.filter((check) => check.level === "pass").length,
  };
}

function escapeRegExp(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
