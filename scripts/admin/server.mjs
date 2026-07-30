#!/usr/bin/env node
/**
 * The review panel.
 *
 * A separate process from the public site on purpose: the site keeps zero auth
 * code and zero write endpoints, and this never has to be reachable from the
 * internet. It binds to 127.0.0.1 by default — put it behind your reverse
 * proxy on HTTPS, and ideally behind an IP allowlist too.
 *
 *   npm run admin:password    generate ADMIN_PASSWORD_HASH
 *   npm run review            start on ADMIN_PORT (default 4100)
 */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { ROOT, loadEnvFile, readConfig } from "../lib/config.mjs";
import {
  deleteArticle,
  publishDraft,
  readAll,
  readLanguage,
  readOne,
  writeArticle,
  writeManifest,
} from "../lib/store.mjs";
import { applyEdits } from "./edits.mjs";
import { auditDraft } from "./seo.mjs";
import {
  CSRF_COOKIE,
  SESSION_COOKIE,
  cookie,
  createCsrfToken,
  createLoginThrottle,
  createSession,
  csrfMatches,
  parseCookies,
  verifyPassword,
  verifySession,
} from "./auth.mjs";
import { draftPage, errorPage, loginPage, queuePage } from "./views.mjs";

loadEnvFile();
const config = readConfig();

const PORT = Number(process.env.ADMIN_PORT ?? 4100);
const HOST = process.env.ADMIN_HOST ?? "127.0.0.1";
const PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH ?? "";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "";
const PUBLISH_COMMAND = process.env.ADMIN_PUBLISH_COMMAND ?? "";
const SECURE_COOKIES = process.env.ADMIN_SECURE_COOKIES !== "false";

if (!PASSWORD_HASH || !SESSION_SECRET) {
  console.error(
    "\n  The review panel needs credentials before it can start:\n\n" +
      "    npm run admin:password      → paste into ADMIN_PASSWORD_HASH\n" +
      "    openssl rand -hex 32        → paste into ADMIN_SESSION_SECRET\n",
  );
  process.exit(1);
}

const throttle = createLoginThrottle();
const siteName = config.site.name;
let generating = false;

// --- helpers ---------------------------------------------------------------

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "content-security-policy":
      "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
    ...headers,
  });
  res.end(body);
}

function redirect(res, location, headers = {}) {
  res.writeHead(303, { location, "cache-control": "no-store", ...headers });
  res.end();
}

async function readForm(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    // Generous for an article, far below anything that could exhaust memory.
    if (size > 2_000_000) throw new Error("Payload too large.");
    chunks.push(chunk);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

function clientKey(req) {
  return req.socket.remoteAddress ?? "unknown";
}

function authed(req) {
  const jar = parseCookies(req.headers.cookie);
  return verifySession(jar[SESSION_COOKIE], SESSION_SECRET);
}

function csrfOk(req, form) {
  const jar = parseCookies(req.headers.cookie);
  return csrfMatches(jar[CSRF_COOKIE], form.get("csrf"));
}

async function auditFor(article) {
  const published = await readLanguage("articles", article.lang);
  return auditDraft(article, {
    published: published.filter((entry) => entry.slug !== article.slug),
    targetWords: config.generation.wordCount,
  });
}

function run(command, args, label) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: ROOT, shell: Boolean(args === null) });
    let output = "";
    child.stdout?.on("data", (chunk) => (output += chunk));
    child.stderr?.on("data", (chunk) => (output += chunk));
    child.on("close", (code) => {
      if (code !== 0) console.error(`[${label}] exited ${code}\n${output}`);
      resolve({ code, output });
    });
    child.on("error", (error) => {
      console.error(`[${label}] ${error.message}`);
      resolve({ code: 1, output: error.message });
    });
  });
}

/** Rebuild + reload the public site so an approved article goes live. */
async function rebuild() {
  await writeManifest(config);
  if (!PUBLISH_COMMAND) return "Published. Rebuild the site to make it live.";

  const { code } = await run("sh", ["-c", PUBLISH_COMMAND], "publish");
  return code === 0
    ? "Published and the site was rebuilt."
    : "Published, but the rebuild command failed — check the panel logs.";
}

// --- routes ----------------------------------------------------------------

async function handle(req, res, url) {
  const { pathname } = url;

  // --- unauthenticated ---
  if (pathname === "/login" && req.method === "GET") {
    if (authed(req)) return redirect(res, "/");
    return send(res, 200, loginPage({ siteName, error: url.searchParams.get("error") }));
  }

  if (pathname === "/login" && req.method === "POST") {
    const key = clientKey(req);
    if (throttle.blocked(key)) {
      return send(
        res,
        429,
        loginPage({ siteName, error: "Too many attempts. Wait 15 minutes." }),
      );
    }

    const form = await readForm(req);
    if (!verifyPassword(form.get("password") ?? "", PASSWORD_HASH)) {
      throttle.fail(key);
      return send(
        res,
        401,
        loginPage({ siteName, error: "That password is not correct." }),
      );
    }

    throttle.succeed(key);
    return redirect(res, "/", {
      "set-cookie": [
        cookie(SESSION_COOKIE, createSession(SESSION_SECRET), {
          maxAge: 12 * 60 * 60,
          secure: SECURE_COOKIES,
        }),
        cookie(CSRF_COOKIE, createCsrfToken(), {
          maxAge: 12 * 60 * 60,
          secure: SECURE_COOKIES,
        }),
      ],
    });
  }

  if (pathname === "/logout" && req.method === "POST") {
    return redirect(res, "/login", {
      "set-cookie": [
        cookie(SESSION_COOKIE, "", { maxAge: 0, secure: SECURE_COOKIES }),
        cookie(CSRF_COOKIE, "", { maxAge: 0, secure: SECURE_COOKIES }),
      ],
    });
  }

  // --- everything below requires a session ---
  if (!authed(req)) return redirect(res, "/login");

  if (pathname === "/" && req.method === "GET") {
    const byLanguage = await readAll("drafts", config.site.codes);
    const drafts = [];
    for (const articles of Object.values(byLanguage)) {
      for (const article of articles) {
        drafts.push({ article, checks: await auditFor(article) });
      }
    }

    const jar = parseCookies(req.headers.cookie);
    return send(
      res,
      200,
      queuePage({
        siteName,
        drafts,
        notice: url.searchParams.get("notice"),
        csrf: jar[CSRF_COOKIE] ?? "",
        generating,
      }),
    );
  }

  if (pathname === "/generate" && req.method === "POST") {
    const form = await readForm(req);
    if (!csrfOk(req, form)) return send(res, 403, errorPage({ siteName, status: 403, message: "Invalid form token. Reload and try again." }));

    if (generating) return redirect(res, "/?notice=A+generation+run+is+already+in+progress.");

    generating = true;
    try {
      const { code } = await run("node", ["scripts/generate-content.mjs"], "generate");
      return redirect(
        res,
        code === 0
          ? "/?notice=New+drafts+generated."
          : "/?notice=Generation+failed+%E2%80%94+check+the+panel+logs.",
      );
    } finally {
      generating = false;
    }
  }

  const draftMatch = pathname.match(/^\/draft\/([^/]+)\/([^/]+)$/);
  if (draftMatch) {
    const lang = decodeURIComponent(draftMatch[1]);
    const slug = decodeURIComponent(draftMatch[2]);

    // Reject anything that could climb out of content/drafts/.
    if (!config.site.codes.includes(lang) || !/^[a-z0-9-]+$/.test(slug)) {
      return send(res, 404, errorPage({ siteName, status: 404, message: "No such draft." }));
    }

    if (req.method === "GET") {
      const article = await readOne("drafts", lang, slug);
      if (!article) {
        return send(res, 404, errorPage({ siteName, status: 404, message: "That draft is gone — it may already be published." }));
      }
      const jar = parseCookies(req.headers.cookie);
      return send(
        res,
        200,
        draftPage({
          siteName,
          article,
          checks: await auditFor(article),
          csrf: jar[CSRF_COOKIE] ?? "",
          notice: url.searchParams.get("notice"),
          error: url.searchParams.get("error"),
        }),
      );
    }

    if (req.method === "POST") {
      const form = await readForm(req);
      if (!csrfOk(req, form)) {
        return send(res, 403, errorPage({ siteName, status: 403, message: "Invalid form token. Reload and try again." }));
      }

      const article = await readOne("drafts", lang, slug);
      if (!article) {
        return send(res, 404, errorPage({ siteName, status: 404, message: "That draft is gone." }));
      }

      const action = form.get("action");

      if (action === "reject") {
        await deleteArticle("drafts", lang, slug);
        return redirect(res, "/?notice=Draft+rejected.");
      }

      const edited = applyEdits(article, form);
      await writeArticle("drafts", edited);

      if (action === "approve") {
        const checks = await auditFor(edited);
        if (checks.some((check) => check.level === "fail")) {
          return redirect(
            res,
            `/draft/${lang}/${slug}?error=Fix+the+failing+checks+before+approving.`,
          );
        }
        await publishDraft(lang, slug);
        const notice = await rebuild();
        return redirect(res, `/?notice=${encodeURIComponent(notice)}`);
      }

      return redirect(res, `/draft/${lang}/${slug}?notice=Saved.`);
    }
  }

  return send(res, 404, errorPage({ siteName, status: 404, message: "Nothing here." }));
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  handle(req, res, url).catch((error) => {
    console.error(`[admin] ${error.stack ?? error.message}`);
    if (!res.headersSent) {
      send(res, 500, errorPage({ siteName, status: 500, message: "Something went wrong. Check the panel logs." }));
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log(`\n  ${siteName} review panel — http://${HOST}:${PORT}`);
  console.log(`  languages: ${config.site.codes.join(", ")}`);
  if (!PUBLISH_COMMAND) {
    console.log("  ADMIN_PUBLISH_COMMAND is unset: approving updates the");
    console.log("  content files but will not rebuild the site.\n");
  } else {
    console.log("");
  }
});
