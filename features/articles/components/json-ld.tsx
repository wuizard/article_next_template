import { jsonLdScript } from "../seo/structured-data";

/** Server-rendered <script type="application/ld+json"> block. */
export function JsonLd({ data }: { data: Record<string, unknown> | null }) {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={jsonLdScript(data)}
    />
  );
}
