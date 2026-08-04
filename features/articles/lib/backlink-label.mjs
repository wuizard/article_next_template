const LOCAL_BALI_VILLAS_HOST = "localbalivillas.com";

/** True for the main domain and its subdomains, but not lookalike domains. */
export function isLocalBaliVillasUrl(href) {
  try {
    const hostname = new URL(href).hostname.toLowerCase();
    return (
      hostname === LOCAL_BALI_VILLAS_HOST ||
      hostname.endsWith(`.${LOCAL_BALI_VILLAS_HOST}`)
    );
  } catch {
    return false;
  }
}

/** The href remains unchanged; only external destinations get a generic label. */
export function backlinkButtonLabel(href, { visitPrefix, externalLabel }) {
  if (!isLocalBaliVillasUrl(href)) return externalLabel;
  return `${visitPrefix} ${href.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
}
