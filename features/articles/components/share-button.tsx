"use client";

import { useState } from "react";

type ShareButtonProps = {
  label: string;
  copiedLabel: string;
};

/**
 * The only client-side island on an article page. Everything else is
 * server-rendered so crawlers get the full text in the initial HTML. Labels
 * come in as props to keep the language dictionary out of the client bundle.
 */
export function ShareButton({ label, copiedLabel }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access denied — leave the label unchanged.
    }
  }

  return (
    <button className="share-button" onClick={copyLink} type="button">
      {copied ? copiedLabel : label}
    </button>
  );
}
