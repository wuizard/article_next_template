import type { Article } from "../types/article";

export const articles: Record<string, Article> = {
  "how-to-choose-a-villa-in-bali": {
    slug: "how-to-choose-a-villa-in-bali",
    category: "Stay well",
    title: "How to choose a villa in Bali",
    deck: "A local guide to finding the right setting, asking the useful questions, and booking a stay that feels effortless.",
    heroImage:
      "https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=2000&q=88",
    publishedAt: "July 24, 2026",
    readTime: "8 min read",
    author: {
      name: "Made Sari",
      role: "Bali travel editor",
      initials: "MS",
    },
    introduction:
      "The best villa is not always the one with the longest infinity pool. It is the one that fits the rhythm of your trip: slow breakfasts, easy beach days, a quiet place for children to sleep, or a table big enough for everyone to gather.",
    sections: [
      {
        id: "start-with-place",
        kicker: "01 — Find your rhythm",
        heading: "Start with the place, not the property",
        paragraphs: [
          "Bali changes character every few kilometres. Ubud mornings arrive with birdsong and mist over the rice fields. Canggu is built around coffee, surf, and a social pace. Uluwatu feels more spacious, with limestone cliffs and sunsets that pull everyone outside.",
          "Before comparing bedrooms, decide how you want an ordinary day to feel. A beautiful villa can become frustrating if every meal, swim, or yoga class begins with an hour in traffic. Map the places you genuinely plan to visit and choose an area that keeps most days simple.",
        ],
      },
      {
        id: "read-between",
        kicker: "02 — Look closely",
        heading: "Read between the listing photos",
        paragraphs: [
          "Wide-angle photographs are excellent at showing atmosphere and less useful at showing distance. Ask for a current floor plan or a short walk-through video. For groups, check whether bedrooms connect internally, whether bathrooms are open-air, and where the pool sits in relation to the living spaces.",
          "Listen for what a listing does not say. “Lively neighbourhood” can mean music after midnight; “traditional setting” can mean roosters before sunrise. Neither is necessarily a problem—surprises are.",
        ],
      },
      {
        id: "service",
        kicker: "03 — The human detail",
        heading: "Good service should feel quietly present",
        paragraphs: [
          "A villa team can change the tone of a stay. Confirm who will meet you, the hours the manager is available, and what is included in the daily service. Breakfast groceries, laundry, airport transfers, and chef services are often charged separately.",
          "The most helpful hosts answer specific questions clearly. They will tell you the honest walk to the beach, arrange a trusted driver, and explain local customs without turning every exchange into an upsell.",
        ],
      },
      {
        id: "book-clearly",
        kicker: "04 — Before you confirm",
        heading: "Book with a clear picture of the total",
        paragraphs: [
          "Check taxes, service charges, security deposits, payment fees, and cancellation terms before paying. If you are travelling in the rainy season, ask about covered common areas and access roads. Families should confirm pool fencing, cot availability, and stair layouts.",
          "Keep the final agreement in writing. It should include the exact villa, dates, guest count, inclusions, total price, and a reliable local contact. Clarity is the quiet luxury that lets the holiday begin before you arrive.",
        ],
      },
    ],
    quote: {
      text: "Choose the villa that makes your ordinary moments in Bali feel easy.",
      attribution: "The Local Bali Villas team",
    },
    inlineImage: {
      src: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1400&q=86",
      alt: "Tropical villa pool surrounded by palms",
      caption:
        "Covered living areas and a thoughtful pool layout matter as much as the view.",
    },
    checklist: [
      "Neighbourhood and realistic travel times",
      "Bedroom layout, privacy, and bathroom style",
      "Noise, construction, and road access",
      "Daily staff hours and included services",
      "Taxes, deposits, cancellation, and payment terms",
      "A named local contact for your arrival",
    ],
    backlink: {
      label: "Recommended local resource",
      title: "Explore handpicked Bali villas",
      description:
        "Browse local stays and speak with a Bali-based team about the right fit for your trip.",
      href: "https://localbalivillas.com",
    },
  },
};
