/**
 * Article drafting via the Claude API.
 *
 * Uses structured outputs so the model returns an object that already matches
 * the `Article` shape the site renders — no brittle markdown parsing. Requests
 * are streamed because a 2,000-word article plus thinking comfortably exceeds
 * the non-streaming HTTP timeout.
 *
 * Every call's real token usage is accumulated so a run can report what it
 * actually cost rather than an estimate.
 */
import Anthropic from "@anthropic-ai/sdk";

/** USD per million tokens. Models absent here report tokens but no price. */
const PRICING = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-fable-5": { input: 10, output: 50 },
  "claude-sonnet-5": { input: 3, output: 15 },
};

/**
 * JSON Schema for one article. Structured outputs require
 * `additionalProperties: false` and an explicit `required` list on every
 * object, and do not support length/count constraints — those live in the
 * prompt instead.
 */
const ARTICLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "slug",
    "category",
    "deck",
    "metaTitle",
    "metaDescription",
    "focusKeyword",
    "keywords",
    "heroImageAlt",
    "introduction",
    "sections",
    "quote",
    "inlineImageAlt",
    "inlineImageCaption",
    "checklist",
    "faqs",
  ],
  properties: {
    title: { type: "string" },
    slug: { type: "string" },
    category: { type: "string" },
    deck: { type: "string" },
    metaTitle: { type: "string" },
    metaDescription: { type: "string" },
    focusKeyword: { type: "string" },
    keywords: { type: "array", items: { type: "string" } },
    heroImageAlt: { type: "string" },
    introduction: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "kicker", "heading", "paragraphs"],
        properties: {
          id: { type: "string" },
          kicker: { type: "string" },
          heading: { type: "string" },
          paragraphs: { type: "array", items: { type: "string" } },
        },
      },
    },
    quote: {
      type: "object",
      additionalProperties: false,
      required: ["text", "attribution"],
      properties: {
        text: { type: "string" },
        attribution: { type: "string" },
      },
    },
    inlineImageAlt: { type: "string" },
    inlineImageCaption: { type: "string" },
    checklist: { type: "array", items: { type: "string" } },
    faqs: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
      },
    },
  },
};

function systemPrompt(config, language) {
  const name = language.promptName;

  return [
    `You are the staff editor of "${config.site.name}", an editorial publication about: ${language.topic}.`,
    `Audience: ${language.audience}.`,
    `House voice: ${language.tone}`,
    "",
    `LANGUAGE: write every field in ${name}. Titles, decks, headings, body prose,`,
    `checklist items, FAQ questions and answers, the meta title and the meta`,
    `description are all in ${name} — no English fallbacks, no bilingual glosses.`,
    `Write as a native speaker and editor of ${name}, using the vocabulary readers`,
    "actually search with rather than a literal translation of English phrasing.",
    "Proper nouns and place names keep their usual local spelling.",
    "The `slug` field is the exception: it is a URL segment, so keep it lowercase",
    "a-z, digits, and hyphens only — transliterate if the language does not use",
    "the Latin alphabet.",
    "",
    "You write for humans first and search engines second. Search performance comes from",
    "genuinely useful, specific, first-hand-feeling writing that answers the reader's real",
    "question better than the competing page — not from keyword density.",
    "",
    "Rules you always follow:",
    "- Every claim is either verifiable general knowledge or framed as guidance, never invented specifics (no fake prices, no fake business names, no fake statistics, no fabricated quotes from real people).",
    "- Write original prose. Never reproduce or closely paraphrase wording from a source you were given; use it only as a signal about what to cover.",
    "- Use the focus keyword naturally in the title, the meta description, the opening paragraph, and one H2. Do not stuff it.",
    "- Prefer concrete, decision-useful detail over adjectives.",
    "- No 'In today's fast-paced world', no 'Look no further', no 'delve', no listicle padding.",
  ].join("\n");
}

function briefPrompt(config, language, brief, existingTitles) {
  const lines = [
    `Write one complete article of roughly ${config.generation.wordCount} words in ${language.promptName}.`,
    "",
    `Focus keyword (the term this page should rank for): "${brief.focusKeyword}"`,
    `Supporting keywords: ${brief.supportingKeywords.join(", ") || "none"}`,
  ];

  if (language.longtail.length > 0) {
    lines.push(
      `Long-tail phrases to answer somewhere in the piece: ${language.longtail.join("; ")}`,
    );
  }

  if (brief.angle) {
    lines.push("", `Angle for this specific piece: ${brief.angle}`);
  }

  if (brief.sourceItems?.length) {
    lines.push(
      "",
      "Recent items from feeds we monitor. Use them ONLY as a signal about what is topical",
      "right now. Do not copy their wording, do not restate them as news, and do not cite",
      "them as sources. They may be in a different language than your output — that does",
      "not change anything: write a standalone evergreen guide, in the target language,",
      "informed by the subject matter:",
      ...brief.sourceItems.map(
        (item) => `  - ${item.title}${item.summary ? ` — ${item.summary}` : ""}`,
      ),
    );
  }

  if (existingTitles.length > 0) {
    lines.push(
      "",
      "We have already published the articles below. Your piece must cover clearly different",
      "ground — a different question, a different reader situation, a different decision.",
      "Do not rewrite any of these:",
      ...existingTitles.map((title) => `  - ${title}`),
    );
  }

  lines.push(
    "",
    "Structure requirements:",
    "- `title`: 55–65 characters, contains the focus keyword, reads like a magazine headline, not a keyword string.",
    "- `slug`: lowercase, hyphenated, 3–7 words, derived from the focus keyword.",
    "- `category`: two or three words naming the section, in the target language.",
    "- `deck`: one sentence, 120–180 characters, the standfirst under the headline.",
    "- `metaTitle`: <= 60 characters. `metaDescription`: 140–158 characters, contains the focus keyword, ends with a reason to click.",
    "- `keywords`: 6–10 terms, focus keyword first.",
    "- `heroImageAlt`: describes a photograph that fits the piece, under 125 characters, no 'image of'.",
    "- `introduction`: 2–3 sentences that state the reader's problem and what this page settles. Contains the focus keyword once.",
    "- `sections`: 4–6 of them. `id` is a short lowercase hyphenated ASCII anchor. `kicker` is a number then a short phrase, like '01 — Find your rhythm'. `heading` is a real H2 a reader would scan for. `paragraphs` is 2–4 paragraphs of 50–110 words each.",
    "- `quote`: one memorable line of advice from the publication's own voice, plus its attribution.",
    "- `inlineImageAlt` / `inlineImageCaption`: for a supporting photograph inside the article.",
    "- `checklist`: 5–7 short, scannable, genuinely actionable items.",
    "- `faqs`: 4–6 questions real readers actually search, each answered in 40–70 words. These are rendered as FAQPage structured data, so the answer must stand alone without the surrounding article.",
  );

  return lines.join("\n");
}

/**
 * Sends one request. Server-side refusal fallbacks are on by default so a
 * declined request is retried on another model inside the same call; if the
 * beta surface is unavailable we transparently retry without it.
 */
async function requestArticle(client, config, system, prompt, { useFallbacks }) {
  const params = {
    model: config.ai.model,
    max_tokens: 32000,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: {
      effort: config.ai.effort,
      format: { type: "json_schema", schema: ARTICLE_SCHEMA },
    },
  };

  const stream = useFallbacks
    ? client.beta.messages.stream({
        ...params,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      })
    : client.messages.stream(params);

  const message = await stream.finalMessage();

  if (message.stop_reason === "refusal") {
    throw new Error(
      `Model declined the request (${message.stop_details?.category ?? "unspecified"}). ` +
        "Adjust the topic or keywords and try again.",
    );
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("Response hit max_tokens; lower CONTENT_WORD_COUNT.");
  }

  const text = message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("Model returned output that was not valid JSON.");
  }

  return { payload, usage: message.usage, model: message.model };
}

/** Turns accumulated usage into a printable cost line. */
function formatSpend({ input, output, calls, model }) {
  const price = PRICING[model];
  const tokens = `${input.toLocaleString()} in / ${output.toLocaleString()} out`;

  if (!price) {
    return `${calls} call(s), ${tokens} — no price on file for "${model}"`;
  }

  const usd = (input / 1e6) * price.input + (output / 1e6) * price.output;
  const each = calls > 0 ? usd / calls : 0;
  return `${calls} call(s), ${tokens} — $${usd.toFixed(4)} ($${each.toFixed(4)}/article)`;
}

export function createWriter(config) {
  const client = new Anthropic({ apiKey: config.ai.apiKey });
  let useFallbacks = true;
  const spend = { input: 0, output: 0, calls: 0, model: config.ai.model };

  async function write(brief, existingTitles) {
    const language = brief.language;
    const system = systemPrompt(config, language);
    const prompt = briefPrompt(config, language, brief, existingTitles);

    let result;
    try {
      result = await requestArticle(client, config, system, prompt, {
        useFallbacks,
      });
    } catch (error) {
      const isBetaProblem =
        useFallbacks &&
        error?.status === 400 &&
        /fallback|beta/i.test(error?.message ?? "");
      if (!isBetaProblem) throw error;
      // This account or SDK version doesn't have the fallback beta — carry on
      // without it for the rest of the run.
      useFallbacks = false;
      result = await requestArticle(client, config, system, prompt, {
        useFallbacks,
      });
    }

    const usage = result.usage ?? {};
    spend.calls += 1;
    spend.input +=
      (usage.input_tokens ?? 0) +
      (usage.cache_read_input_tokens ?? 0) +
      (usage.cache_creation_input_tokens ?? 0);
    spend.output += usage.output_tokens ?? 0;
    // A server-side fallback can answer on a different model than requested.
    if (result.model) spend.model = result.model;

    return result.payload;
  }

  return {
    write,
    spend,
    formatSpend: () => formatSpend(spend),
  };
}
