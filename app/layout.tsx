import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Local Edit | Bali Villa & Travel Journal",
  description:
    "Thoughtful Bali travel notes, villa guides, and local recommendations from Local Bali Villas.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "The Local Edit | Bali Villa & Travel Journal",
    description:
      "A practical guide to choosing the right Bali villa, from Ubud to the coast.",
    type: "article",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "The Local Edit | Bali Villa & Travel Journal",
    description:
      "A practical guide to choosing the right Bali villa, from Ubud to the coast.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
