import { absoluteUrl, site } from "@/features/articles/data/articles";

export async function GET() {
  const body = site.indexable
    ? `User-agent: *
Allow: /

Sitemap: ${absoluteUrl("/sitemap.xml")}
`
    : `# SEO_INDEXABLE=false — this deployment must not be indexed.
User-agent: *
Disallow: /
`;

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
