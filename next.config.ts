import type { NextConfig } from "next";
import site from "./content/site.json";

/**
 * `/` has no content of its own — every page lives under a language prefix so
 * `<html lang>` can be correct. A 308 to the default language keeps one
 * canonical URL per page rather than serving the same archive at two paths.
 */
const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/",
        destination: `/${site.defaultLanguage}`,
        permanent: true,
      },
      // Keep pre-i18n article URLs working.
      {
        source: "/articles/:slug",
        destination: `/${site.defaultLanguage}/articles/:slug`,
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
