import {
  getSummaries,
  isLanguage,
  languageCodes,
} from "@/features/articles/data/articles";

/**
 * JSON index of the archive. The site itself renders on the server and does
 * not call this — it exists for external consumers.
 *
 *   /api/articles           every language, grouped
 *   /api/articles?lang=id   one language, as a flat array
 */
export async function GET(request: Request) {
  const lang = new URL(request.url).searchParams.get("lang");
  const headers = { "Cache-Control": "public, max-age=300, s-maxage=3600" };

  if (lang) {
    if (!isLanguage(lang)) {
      return Response.json(
        { message: `Unknown language "${lang}".`, languages: languageCodes },
        { status: 404 },
      );
    }
    return Response.json(getSummaries(lang), { headers });
  }

  return Response.json(
    Object.fromEntries(languageCodes.map((code) => [code, getSummaries(code)])),
    { headers },
  );
}
