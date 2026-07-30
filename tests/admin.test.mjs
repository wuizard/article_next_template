/**
 * Unit tests for the review panel's two pieces of real logic: the SEO audit
 * that gates approval, and the edit merge that writes back to a draft.
 *
 * The merge tests exist because an early version wiped any field the form did
 * not submit — a partial POST silently deleted an article's body.
 */
import assert from "node:assert/strict";
import test from "node:test";

import { auditDraft, auditSummary } from "../scripts/admin/seo.mjs";
import { applyEdits } from "../scripts/admin/edits.mjs";
import {
  createSession,
  csrfMatches,
  hashPassword,
  parseCookies,
  verifyPassword,
  verifySession,
} from "../scripts/admin/auth.mjs";

function draft(overrides = {}) {
  const paragraph = (n) =>
    `${"Kalimat panjang untuk menguji penghitungan kata pada bagian ini. ".repeat(n)}`;

  return {
    slug: "cara-memilih-villa-di-bali",
    lang: "id",
    status: "draft",
    category: "Menginap nyaman",
    title: "Cara memilih villa di Bali tanpa kejutan biaya",
    deck: "Panduan singkat untuk memilih kawasan, membaca listing, dan memesan dengan tenang.",
    heroImage: "https://example.test/hero.jpg",
    heroImageAlt: "Kolam renang villa di Bali pada pagi hari",
    publishedAt: "2026-07-30T08:00:00.000Z",
    updatedAt: "2026-07-30T08:00:00.000Z",
    readTime: "5 min read",
    wordCount: 0,
    author: { name: "Made Sari", role: "Editor", initials: "MS" },
    seo: {
      metaTitle: "Cara Memilih Villa di Bali Tanpa Kejutan Biaya",
      metaDescription:
        "Cara memilih villa di Bali: menentukan kawasan yang tepat, membaca di balik foto listing, dan memesan tanpa biaya tersembunyi yang mengejutkan nanti.",
      focusKeyword: "cara memilih villa di bali",
      keywords: ["cara memilih villa di bali"],
    },
    introduction: `Cara memilih villa di Bali dimulai dari ritme harimu. ${paragraph(4)}`,
    sections: [
      {
        id: "kawasan",
        kicker: "01",
        heading: "Cara memilih villa di Bali dimulai dari kawasan",
        paragraphs: [paragraph(8), paragraph(8)],
      },
      {
        id: "listing",
        kicker: "02",
        heading: "Membaca di balik foto listing",
        paragraphs: [paragraph(8), paragraph(8)],
      },
      {
        id: "layanan",
        kicker: "03",
        heading: "Layanan harian",
        paragraphs: [paragraph(8), paragraph(8)],
      },
    ],
    quote: { text: "Pilih yang membuat harimu mudah.", attribution: "Tim" },
    inlineImage: { src: "https://example.test/inline.jpg", alt: "Kolam", caption: "Kolam" },
    checklist: ["Satu", "Dua", "Tiga", "Empat", "Lima"],
    faqs: [
      { question: "Berapa lama sebelumnya?", answer: paragraph(3) },
      { question: "Apa yang belum termasuk?", answer: paragraph(3) },
      { question: "Aman untuk anak?", answer: paragraph(3) },
    ],
    backlink: { label: "L", title: "T", description: "D", href: "https://example.test" },
    source: { type: "ai" },
    ...overrides,
  };
}

const form = (entries) => new URLSearchParams(entries);

// --- the audit -------------------------------------------------------------

test("a well-formed draft has no blocking checks", () => {
  const checks = auditDraft(draft(), { targetWords: 800 });
  const { fail } = auditSummary(checks);
  assert.equal(
    fail,
    0,
    `expected no failures, got: ${checks
      .filter((check) => check.level === "fail")
      .map((check) => `${check.label} — ${check.detail}`)
      .join("; ")}`,
  );
});

test("placeholder copy blocks approval", () => {
  const article = draft();
  article.introduction = "PLACEHOLDER COPY — drafted without an API key.";
  const checks = auditDraft(article, { targetWords: 800 });
  assert.ok(
    checks.some(
      (check) => check.level === "fail" && /placeholder/i.test(check.label),
    ),
  );
});

test("a truncated draft blocks, a merely short one only warns", () => {
  const truncated = draft({ sections: [], faqs: [], introduction: "Terlalu pendek." });
  assert.ok(
    auditDraft(truncated, { targetWords: 2000 }).some(
      (check) => check.level === "fail" && check.label === "Length",
    ),
    "under 400 words should fail",
  );

  const short = auditDraft(draft(), { targetWords: 4000 }).find(
    (check) => check.label === "Length",
  );
  assert.equal(short.level, "warn", "short-of-target should warn, not block");
});

test("a duplicate slug blocks approval", () => {
  const checks = auditDraft(draft(), {
    targetWords: 800,
    published: [{ slug: "cara-memilih-villa-di-bali", title: "Sudah terbit" }],
  });
  assert.ok(
    checks.some(
      (check) => check.level === "fail" && check.label === "Duplicate slug",
    ),
  );
});

test("a missing focus keyword blocks; poor placement warns", () => {
  const noKeyword = draft();
  noKeyword.seo.focusKeyword = "";
  assert.ok(
    auditDraft(noKeyword, { targetWords: 800 }).some(
      (check) => check.level === "fail" && check.label === "Focus keyword",
    ),
  );

  const misplaced = draft();
  misplaced.title = "Sebuah judul tanpa istilah target";
  const check = auditDraft(misplaced, { targetWords: 800 }).find((entry) =>
    entry.label.startsWith("Focus keyword"),
  );
  assert.equal(check.level, "warn");
  assert.match(check.detail, /headline/);
});

test("keyword stuffing is flagged", () => {
  const stuffed = draft();
  stuffed.sections = [
    {
      id: "x",
      kicker: "01",
      heading: "Cara memilih villa di Bali",
      paragraphs: ["cara memilih villa di bali ".repeat(40)],
    },
  ];
  assert.ok(
    auditDraft(stuffed, { targetWords: 800 }).some(
      (check) => check.label === "Keyword density",
    ),
  );
});

// --- the edit merge --------------------------------------------------------

test("edits apply only to submitted fields", () => {
  const original = draft();
  const edited = applyEdits(
    original,
    form({ title: "Judul baru", "section.1.heading": "Judul bagian baru" }),
  );

  assert.equal(edited.title, "Judul baru");
  assert.equal(edited.sections[1].heading, "Judul bagian baru");

  // Everything not submitted survives untouched.
  assert.deepEqual(edited.checklist, original.checklist);
  assert.deepEqual(edited.sections[0].paragraphs, original.sections[0].paragraphs);
  assert.equal(edited.introduction, original.introduction);
  assert.equal(edited.seo.metaDescription, original.seo.metaDescription);
  assert.deepEqual(edited.faqs, original.faqs);
});

test("a submit carrying no content fields destroys nothing", () => {
  const original = draft();
  const edited = applyEdits(original, form({ action: "approve", csrf: "x" }));

  assert.deepEqual(edited.sections, original.sections);
  assert.deepEqual(edited.checklist, original.checklist);
  assert.deepEqual(edited.faqs, original.faqs);
  assert.equal(edited.introduction, original.introduction);
});

test("a blanked section body keeps the previous paragraphs", () => {
  const original = draft();
  const edited = applyEdits(original, form({ "section.0.body": "   \n\n  " }));
  assert.deepEqual(edited.sections[0].paragraphs, original.sections[0].paragraphs);
});

test("an explicitly emptied checklist is honoured", () => {
  const edited = applyEdits(draft(), form({ checklist: "" }));
  assert.deepEqual(edited.checklist, []);
});

test("paragraphs split on blank lines and word counts follow", () => {
  const edited = applyEdits(
    draft(),
    form({ "section.0.body": "Paragraf satu.\n\nParagraf dua.\n\n\nParagraf tiga." }),
  );
  assert.deepEqual(edited.sections[0].paragraphs, [
    "Paragraf satu.",
    "Paragraf dua.",
    "Paragraf tiga.",
  ]);
  assert.ok(edited.wordCount > 0);
  assert.match(edited.readTime, /min read$/);
  assert.notEqual(edited.updatedAt, draft().updatedAt);
});

// --- auth ------------------------------------------------------------------

test("passwords verify only against their own hash", () => {
  const stored = hashPassword("a-sufficiently-long-passphrase");
  assert.equal(verifyPassword("a-sufficiently-long-passphrase", stored), true);
  assert.equal(verifyPassword("wrong", stored), false);
  assert.equal(verifyPassword("", stored), false);
  assert.equal(verifyPassword("x", "not-a-hash"), false);
});

test("sessions are rejected when tampered with or unsigned", () => {
  const secret = "test-secret";
  const token = createSession(secret);

  assert.equal(verifySession(token, secret), true);
  assert.equal(verifySession(token, "other-secret"), false);
  assert.equal(verifySession(`${token}x`, secret), false);
  assert.equal(verifySession("", secret), false);

  // An expiry in the past is refused even with a valid signature.
  const [, signature] = token.split(".");
  assert.equal(verifySession(`1.${signature}`, secret), false);
});

test("csrf tokens compare exactly", () => {
  assert.equal(csrfMatches("abc", "abc"), true);
  assert.equal(csrfMatches("abc", "abd"), false);
  assert.equal(csrfMatches("abc", "ab"), false);
  assert.equal(csrfMatches("", ""), false);
  assert.equal(csrfMatches(undefined, "abc"), false);
});

test("cookies parse into a jar", () => {
  const jar = parseCookies("a=1; b=hello%20world; malformed");
  assert.equal(jar.a, "1");
  assert.equal(jar.b, "hello world");
  assert.equal(jar.malformed, undefined);
});
