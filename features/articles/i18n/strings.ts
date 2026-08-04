/**
 * UI chrome for every language the site ships. Article text itself is written
 * by the generator and lives in `content/articles/<lang>/*.json` — this file
 * only covers the furniture around it: navigation, headings, buttons,
 * breadcrumbs.
 *
 * To add a language: copy one dictionary, translate it, register it in
 * `dictionaries` below, then add the code to SITE_LANGUAGES in `.env`. A
 * language with no dictionary still works — it falls back to English chrome.
 */
export type UiStrings = {
  skipToContent: string;
  homeAria: (siteName: string) => string;
  mainNavAria: string;
  navJournal: string;
  navGuide: string;
  navCta: string;
  languageSwitcherAria: string;
  readAtSource: string;

  /** Two lines of the archive headline. */
  headline: [string, string];
  latestStories: string;
  emptyIndexBefore: string;
  emptyIndexAfter: string;
  readStory: string;
  whatWeCover: string;
  topicLede: (siteName: string, keyword: string) => string;

  breadcrumbAria: string;
  breadcrumbHome: string;
  articleSectionsAria: string;
  inThisGuide: string;
  updatedPrefix: string;
  copyLink: string;
  linkCopied: string;

  checklistHeading: string;
  frequentlyAsked: string;
  faqHeading: string;
  keepReading: string;
  recommendedAria: string;
  visitPrefix: string;
  visitSite: string;
  inlineBacklinkPrefix: string;
  inlineBacklinkLabel: string;
  inlineBacklinkSuffix: string;

  sourceNotePrefix: string;
  sourceNoteFallbackLink: string;
  sourceNoteBy: string;
  sourceNoteSuffix: string;

  notFoundHeading: string;
  notFoundLead: string;
  notFoundLink: string;

  footerHomeHeading: string;
  footerArticleHeading: string;
  footerTagline: string;
};

const en: UiStrings = {
  skipToContent: "Skip to content",
  homeAria: (siteName) => `${siteName} home`,
  mainNavAria: "Main navigation",
  navJournal: "Travel notes",
  navGuide: "Villa guide",
  navCta: "Find a villa",
  languageSwitcherAria: "Choose a language",
  readAtSource: "Read at the source",

  headline: ["Travel slowly.", "Stay locally."],
  latestStories: "Latest stories",
  emptyIndexBefore: "No articles yet. Run ",
  emptyIndexAfter: " to publish the first one.",
  readStory: "Read the full story",
  whatWeCover: "What we cover",
  topicLede: (siteName, keyword) =>
    `${siteName} is a working notebook about ${keyword} and everything around it:`,

  breadcrumbAria: "Breadcrumb",
  breadcrumbHome: "Home",
  articleSectionsAria: "Article sections",
  inThisGuide: "In this guide",
  updatedPrefix: "Updated",
  copyLink: "Copy article link",
  linkCopied: "Link copied",

  checklistHeading: "Your pre-booking checklist",
  frequentlyAsked: "Frequently asked",
  faqHeading: "Questions travellers ask",
  keepReading: "Keep reading",
  recommendedAria: "Recommended resource",
  visitPrefix: "Visit",
  visitSite: "Visit Site",
  inlineBacklinkPrefix: "Use ",
  inlineBacklinkLabel: "our checklist tool",
  inlineBacklinkSuffix: ".",

  sourceNotePrefix: "Summarised from ",
  sourceNoteFallbackLink: "the original report",
  sourceNoteBy: " by ",
  sourceNoteSuffix: ". Read the full piece at the source.",

  notFoundHeading: "We couldn’t find that story.",
  notFoundLead: "It may have moved. ",
  notFoundLink: "Browse the latest travel notes",

  footerHomeHeading: "Find your own corner of Bali.",
  footerArticleHeading:
    "Stay somewhere that feels like your own corner of Bali.",
  footerTagline: "Travel slowly. Stay locally.",
};

const id: UiStrings = {
  skipToContent: "Lewati ke konten",
  homeAria: (siteName) => `Beranda ${siteName}`,
  mainNavAria: "Navigasi utama",
  navJournal: "Catatan perjalanan",
  navGuide: "Panduan villa",
  navCta: "Cari villa",
  languageSwitcherAria: "Pilih bahasa",
  readAtSource: "Baca di sumber aslinya",

  headline: ["Jalan pelan-pelan.", "Menginap ala lokal."],
  latestStories: "Tulisan terbaru",
  emptyIndexBefore: "Belum ada artikel. Jalankan ",
  emptyIndexAfter: " untuk menerbitkan yang pertama.",
  readStory: "Baca selengkapnya",
  whatWeCover: "Yang kami bahas",
  topicLede: (siteName, keyword) =>
    `${siteName} adalah catatan berjalan tentang ${keyword} dan segala hal di sekitarnya:`,

  breadcrumbAria: "Remah roti",
  breadcrumbHome: "Beranda",
  articleSectionsAria: "Bagian artikel",
  inThisGuide: "Isi panduan ini",
  updatedPrefix: "Diperbarui",
  copyLink: "Salin tautan artikel",
  linkCopied: "Tautan disalin",

  checklistHeading: "Daftar periksa sebelum memesan",
  frequentlyAsked: "Sering ditanyakan",
  faqHeading: "Pertanyaan yang sering diajukan",
  keepReading: "Bacaan lainnya",
  recommendedAria: "Rujukan pilihan",
  visitPrefix: "Kunjungi",
  visitSite: "Kunjungi Site",
  inlineBacklinkPrefix: "Gunakan ",
  inlineBacklinkLabel: "alat checklist kami",
  inlineBacklinkSuffix: ".",

  sourceNotePrefix: "Diringkas dari ",
  sourceNoteFallbackLink: "laporan aslinya",
  sourceNoteBy: " oleh ",
  sourceNoteSuffix: ". Baca versi lengkapnya di sumber aslinya.",

  notFoundHeading: "Artikel itu tidak kami temukan.",
  notFoundLead: "Mungkin sudah dipindahkan. ",
  notFoundLink: "Lihat catatan perjalanan terbaru",

  footerHomeHeading: "Temukan sudut Bali versimu sendiri.",
  footerArticleHeading: "Menginap di tempat yang terasa seperti rumah sendiri.",
  footerTagline: "Jalan pelan-pelan. Menginap ala lokal.",
};

const dictionaries: Record<string, UiStrings> = { en, id };

/** Falls back to English for any language that has no dictionary yet. */
export function getStrings(lang: string): UiStrings {
  const base = lang.toLowerCase().split(/[-_]/)[0];
  return dictionaries[base] ?? en;
}

export const availableLanguages = Object.keys(dictionaries);
