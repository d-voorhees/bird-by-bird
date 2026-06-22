"use client";

import Link from "next/link";

const footerLinkClass = "text-xs leading-none text-ink/50 transition hover:text-ink";

export function AuthCreditsFooter() {
  return (
    <footer className="w-full shrink-0 px-6 pb-6">
      <div className="flex items-center justify-end gap-1.5 text-xs leading-none">
        <Link href="/privacy" className={footerLinkClass}>
          privacy
        </Link>
        <span className="text-ink/50" aria-hidden="true">
          ·
        </span>
        <Link href="/credits" className={footerLinkClass}>
          credits
        </Link>
      </div>
    </footer>
  );
}
