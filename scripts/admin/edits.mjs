/**
 * Merging reviewer edits back into a draft.
 *
 * Kept separate from the server so it can be tested without opening a port —
 * and because it is the one place where a mistake silently destroys content.
 */
import { countWords, readTime } from "../lib/text.mjs";

/** Recomputes the fields derived from the body text. */
export function restat(article) {
  const words = countWords(
    [
      article.introduction,
      ...article.sections.flatMap((section) => section.paragraphs),
      ...article.faqs.map((faq) => faq.answer),
    ].join(" "),
  );
  return { ...article, wordCount: words, readTime: readTime(words) };
}

/**
 * Applies only the fields the form actually submitted. A missing key means
 * "not edited", never "set to empty" — otherwise a partial POST would silently
 * delete an article's body.
 */
export function applyEdits(article, form) {
  const next = structuredClone(article);
  const text = (key, current) =>
    form.has(key) ? (form.get(key)?.trim() ?? current) : current;

  next.title = text("title", next.title) || next.title;
  next.deck = text("deck", next.deck);
  next.category = text("category", next.category) || next.category;
  next.introduction = text("introduction", next.introduction);
  next.seo = {
    ...next.seo,
    metaTitle: text("metaTitle", next.seo.metaTitle),
    metaDescription: text("metaDescription", next.seo.metaDescription),
  };

  next.sections = next.sections.map((section, index) => {
    const bodyKey = `section.${index}.body`;
    const paragraphs = form.has(bodyKey)
      ? (form.get(bodyKey) ?? "")
          .split(/\n\s*\n/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
      : section.paragraphs;

    return {
      ...section,
      heading:
        text(`section.${index}.heading`, section.heading) || section.heading,
      // Never let an edit blank a section outright.
      paragraphs: paragraphs.length > 0 ? paragraphs : section.paragraphs,
    };
  });

  // An explicitly submitted empty checklist is a real instruction; an absent
  // one is not.
  if (form.has("checklist")) {
    next.checklist = (form.get("checklist") ?? "")
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  next.faqs = next.faqs.map((faq, index) => ({
    question: text(`faq.${index}.question`, faq.question) || faq.question,
    answer: text(`faq.${index}.answer`, faq.answer) || faq.answer,
  }));

  next.updatedAt = new Date().toISOString();
  return restat(next);
}
