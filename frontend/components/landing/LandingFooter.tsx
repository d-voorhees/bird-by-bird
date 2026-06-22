import Link from "next/link";

const footerLinkClass = "text-xs leading-none text-ink/50 transition hover:text-ink";

function Dot() {
  return (
    <span className="text-ink/50" aria-hidden="true">
      ·
    </span>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t border-stone/20 px-6 py-10">
      <div className="mx-auto w-full max-w-2xl text-center">
        <p className="text-sm text-ink/60">A small project from Medium &amp; Message.</p>
        <nav
          className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs leading-none"
          aria-label="Footer"
        >
          <Link href="/credits" className={footerLinkClass}>
            credits
          </Link>
          <Dot />
          <Link href="/privacy" className={footerLinkClass}>
            privacy
          </Link>
          <Dot />
          <span className="text-xs leading-none text-ink/35">source</span>
          <Dot />
          <span className="text-xs leading-none text-ink/35">changelog</span>
          <Dot />
          <span className="text-xs leading-none text-ink/35">build notes</span>
        </nav>
      </div>
    </footer>
  );
}
