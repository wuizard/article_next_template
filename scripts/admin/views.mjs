/**
 * HTML for the review panel. Server-rendered strings with inline CSS — no
 * build step, no dependencies, works over a slow connection from a phone.
 */
import { auditSummary } from "./seo.mjs";

/** Prefix for every link and form action when mounted under a sub-path. */
let basePath = "";
export function setBasePath(value) {
  basePath = value ?? "";
}
const at = (path) => `${basePath}${path}`;

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const STYLES = `
:root {
  --bg: #14100e; --panel: #1e1916; --line: #322a25; --ink: #f3ece2;
  --muted: #a2958a; --clay: #d08a5f; --ok: #6fae7c; --warn: #d8ab4e;
  --fail: #d4685c;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  margin: 0; background: var(--bg); color: var(--ink);
  font: 15px/1.6 ui-sans-serif, system-ui, -apple-system, sans-serif;
}
a { color: var(--clay); }
header.bar {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1rem; padding: .9rem 1.5rem; border-bottom: 1px solid var(--line);
  background: var(--panel); position: sticky; top: 0; z-index: 5;
}
header.bar h1 { margin: 0; font-size: .82rem; letter-spacing: .16em; text-transform: uppercase; }
.wrap { max-width: 1180px; margin: 0 auto; padding: 1.75rem 1.5rem 4rem; }
.narrow { max-width: 460px; }
.card {
  padding: 1.4rem; border: 1px solid var(--line); border-radius: 10px;
  background: var(--panel); margin-bottom: 1rem;
}
.queue { display: grid; gap: .8rem; }
.queue-item {
  display: flex; flex-wrap: wrap; align-items: center; gap: .9rem;
  padding: 1.1rem 1.3rem; border: 1px solid var(--line); border-radius: 10px;
  background: var(--panel); text-decoration: none; color: inherit;
}
.queue-item:hover { border-color: var(--clay); }
.queue-item h2 { margin: 0; font-size: 1.06rem; flex: 1 1 340px; font-weight: 600; }
.tag {
  padding: .2rem .55rem; border-radius: 999px; font-size: .66rem;
  letter-spacing: .1em; text-transform: uppercase; border: 1px solid var(--line);
  color: var(--muted); white-space: nowrap;
}
.tag.ok { color: var(--ok); border-color: var(--ok); }
.tag.warn { color: var(--warn); border-color: var(--warn); }
.tag.fail { color: var(--fail); border-color: var(--fail); }
.meta { color: var(--muted); font-size: .8rem; }
.grid { display: grid; grid-template-columns: minmax(0,1fr) 340px; gap: 1.5rem; align-items: start; }
@media (max-width: 940px) { .grid { grid-template-columns: 1fr; } }
label { display: block; margin: 0 0 1rem; font-size: .74rem; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); }
input[type=text], input[type=password], textarea {
  width: 100%; margin-top: .4rem; padding: .6rem .7rem; border: 1px solid var(--line);
  border-radius: 7px; background: #100d0b; color: var(--ink);
  font: inherit; resize: vertical;
}
input:focus, textarea:focus { outline: 2px solid var(--clay); outline-offset: 1px; }
textarea { min-height: 6.5rem; line-height: 1.65; }
button {
  padding: .62rem 1.05rem; border: 1px solid var(--line); border-radius: 7px;
  background: #2a231e; color: var(--ink); font: inherit; cursor: pointer;
}
button:hover { border-color: var(--clay); }
button.primary { background: var(--clay); border-color: var(--clay); color: #1b1310; font-weight: 600; }
button.danger { color: var(--fail); }
.actions { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: 1.2rem; }
.checks { display: grid; gap: .55rem; margin: 0; padding: 0; list-style: none; }
.checks li { display: grid; grid-template-columns: 12px 1fr; gap: .6rem; font-size: .84rem; }
.checks li::before { content: "●"; line-height: 1.4; }
.checks li.pass::before { color: var(--ok); }
.checks li.warn::before { color: var(--warn); }
.checks li.fail::before { color: var(--fail); }
.checks strong { display: block; font-weight: 600; }
.checks span { color: var(--muted); }
.preview h2 { font-size: 1.3rem; margin: 2rem 0 .5rem; }
.preview h3 { font-size: 1rem; margin: 1.4rem 0 .4rem; }
.preview p { margin: 0 0 .9rem; }
.preview .kicker { color: var(--clay); font-size: .68rem; letter-spacing: .16em; text-transform: uppercase; }
.notice { padding: .8rem 1rem; border-radius: 8px; margin-bottom: 1.2rem; border: 1px solid; }
.notice.ok { border-color: var(--ok); color: var(--ok); }
.notice.err { border-color: var(--fail); color: var(--fail); }
.empty { padding: 3rem 1.5rem; text-align: center; color: var(--muted); }
code { background: #100d0b; padding: .1rem .35rem; border-radius: 4px; font-size: .88em; }
`;

function page({ title, body, siteName }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHtml(title)} · ${escapeHtml(siteName)}</title>
<style>${STYLES}</style>
</head><body>${body}</body></html>`;
}

export function loginPage({ siteName, error }) {
  return page({
    siteName,
    title: "Sign in",
    body: `<div class="wrap narrow">
  <h1 style="font-size:1.1rem;letter-spacing:.14em;text-transform:uppercase">${escapeHtml(siteName)} review</h1>
  ${error ? `<div class="notice err">${escapeHtml(error)}</div>` : ""}
  <form class="card" method="post" action="${at('/login')}">
    <label>Password
      <input type="password" name="password" autocomplete="current-password" autofocus required>
    </label>
    <button class="primary" type="submit">Sign in</button>
  </form>
</div>`,
  });
}

function bar(siteName, extra = "") {
  return `<header class="bar">
  <h1><a href="${at('/')}" style="text-decoration:none;color:inherit">${escapeHtml(siteName)} review</a></h1>
  <div style="display:flex;gap:.6rem;align-items:center">${extra}
    <form method="post" action="${at('/logout')}" style="margin:0"><button type="submit">Sign out</button></form>
  </div>
</header>`;
}

export function queuePage({ siteName, drafts, notice, csrf, generating }) {
  const items = drafts
    .map(({ article, checks }) => {
      const { fail, warn } = auditSummary(checks);
      const state = fail ? "fail" : warn ? "warn" : "ok";
      const label = fail
        ? `${fail} blocking`
        : warn
          ? `${warn} to review`
          : "ready";
      return `<a class="queue-item" href="${at(`/draft/${encodeURIComponent(article.lang)}/${encodeURIComponent(article.slug)}`)}">
  <span class="tag">${escapeHtml(article.lang.toUpperCase())}</span>
  <h2>${escapeHtml(article.title)}</h2>
  <span class="tag ${state}">${escapeHtml(label)}</span>
  <span class="meta">${article.wordCount} words</span>
</a>`;
    })
    .join("\n");

  return page({
    siteName,
    title: "Drafts",
    body: `${bar(siteName)}
<div class="wrap">
  ${notice ? `<div class="notice ok">${escapeHtml(notice)}</div>` : ""}
  <form method="post" action="${at('/generate')}" style="margin-bottom:1.5rem">
    <input type="hidden" name="csrf" value="${escapeHtml(csrf)}">
    <button class="primary" type="submit"${generating ? " disabled" : ""}>Generate new drafts</button>
    <span class="meta" style="margin-left:.6rem">Runs the generator for every language.</span>
  </form>
  ${
    drafts.length === 0
      ? `<div class="card empty">No drafts waiting. Generate some, or wait for the nightly run.</div>`
      : `<div class="queue">${items}</div>`
  }
</div>`,
  });
}

function checkList(checks) {
  return `<ul class="checks">${checks
    .map(
      (check) =>
        `<li class="${check.level}"><span><strong>${escapeHtml(check.label)}</strong>${escapeHtml(check.detail)}</span></li>`,
    )
    .join("")}</ul>`;
}

function previewBody(article) {
  const sections = article.sections
    .map(
      (section) => `<section>
  <span class="kicker">${escapeHtml(section.kicker)}</span>
  <h2>${escapeHtml(section.heading)}</h2>
  ${section.paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
</section>`,
    )
    .join("");

  const faqs = article.faqs.length
    ? `<h2>FAQ</h2>${article.faqs
        .map(
          (faq) =>
            `<h3>${escapeHtml(faq.question)}</h3><p>${escapeHtml(faq.answer)}</p>`,
        )
        .join("")}`
    : "";

  const checklist = article.checklist.length
    ? `<h2>Checklist</h2><ul>${article.checklist
        .map((item) => `<li>${escapeHtml(item)}</li>`)
        .join("")}</ul>`
    : "";

  return `<div class="preview">
  <span class="kicker">${escapeHtml(article.category)}</span>
  <h2 style="margin-top:.3rem;font-size:1.75rem">${escapeHtml(article.title)}</h2>
  <p class="meta">${escapeHtml(article.deck)}</p>
  <p>${escapeHtml(article.introduction)}</p>
  ${sections}${checklist}${faqs}
</div>`;
}

function field(name, label, value, { textarea = false, rows } = {}) {
  const input = textarea
    ? `<textarea name="${name}"${rows ? ` rows="${rows}"` : ""}>${escapeHtml(value)}</textarea>`
    : `<input type="text" name="${name}" value="${escapeHtml(value)}">`;
  return `<label>${escapeHtml(label)}${input}</label>`;
}

export function draftPage({ siteName, article, checks, csrf, notice, error }) {
  const { fail } = auditSummary(checks);
  const sourceNote = article.source?.informedBy?.length
    ? `<p class="meta">Informed by: ${escapeHtml(article.source.informedBy.join(", "))}</p>`
    : "";

  const sectionFields = article.sections
    .map(
      (section, index) => `<div class="card">
  ${field(`section.${index}.heading`, `Section ${index + 1} heading`, section.heading)}
  ${field(`section.${index}.body`, "Paragraphs (blank line between)", section.paragraphs.join("\n\n"), { textarea: true, rows: 8 })}
</div>`,
    )
    .join("");

  const faqFields = article.faqs
    .map(
      (faq, index) => `<div class="card">
  ${field(`faq.${index}.question`, `Question ${index + 1}`, faq.question)}
  ${field(`faq.${index}.answer`, "Answer", faq.answer, { textarea: true, rows: 4 })}
</div>`,
    )
    .join("");

  return page({
    siteName,
    title: article.title,
    body: `${bar(siteName, `<a href="${at('/')}" style="align-self:center">← All drafts</a>`)}
<div class="wrap">
  ${notice ? `<div class="notice ok">${escapeHtml(notice)}</div>` : ""}
  ${error ? `<div class="notice err">${escapeHtml(error)}</div>` : ""}
  <p class="meta">${escapeHtml(article.lang.toUpperCase())} · ${article.wordCount} words · focus keyword “${escapeHtml(article.seo.focusKeyword)}”</p>
  ${sourceNote}

  <div class="grid">
    <form method="post" action="${at(`/draft/${encodeURIComponent(article.lang)}/${encodeURIComponent(article.slug)}`)}">
      <input type="hidden" name="csrf" value="${escapeHtml(csrf)}">

      <div class="card">
        ${field("title", "Headline", article.title)}
        ${field("deck", "Standfirst", article.deck, { textarea: true, rows: 3 })}
        ${field("category", "Category", article.category)}
        ${field("metaTitle", "Meta title (≤ 60)", article.seo.metaTitle)}
        ${field("metaDescription", "Meta description (120–158)", article.seo.metaDescription, { textarea: true, rows: 3 })}
        ${field("introduction", "Opening paragraph", article.introduction, { textarea: true, rows: 5 })}
      </div>

      ${sectionFields}

      <div class="card">
        ${field("checklist", "Checklist (one per line)", article.checklist.join("\n"), { textarea: true, rows: 7 })}
      </div>

      ${faqFields}

      <div class="actions">
        <button type="submit" name="action" value="save">Save changes</button>
        <button class="primary" type="submit" name="action" value="approve"${fail ? " disabled title='Fix the blocking checks first'" : ""}>Approve &amp; publish</button>
        <button class="danger" type="submit" name="action" value="reject" formnovalidate onclick="return confirm('Delete this draft permanently?')">Reject</button>
      </div>
      ${fail ? `<p class="meta">Approval is blocked until the ${fail} failing check${fail === 1 ? "" : "s"} on the right ${fail === 1 ? "is" : "are"} resolved.</p>` : ""}
    </form>

    <aside>
      <div class="card">
        <h2 style="margin:0 0 .9rem;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase">SEO checks</h2>
        ${checkList(checks)}
      </div>
      <div class="card">
        <h2 style="margin:0 0 .9rem;font-size:.78rem;letter-spacing:.14em;text-transform:uppercase">Preview</h2>
        ${previewBody(article)}
      </div>
    </aside>
  </div>
</div>`,
  });
}

export function errorPage({ siteName, status, message }) {
  return page({
    siteName,
    title: `${status}`,
    body: `<div class="wrap narrow"><div class="card"><h1 style="margin-top:0">${status}</h1><p>${escapeHtml(message)}</p><p><a href="${at('/')}">Back to drafts</a></p></div></div>`,
  });
}
