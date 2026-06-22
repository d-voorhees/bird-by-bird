import Link from "next/link";

const primaryClass =
  "inline-flex min-w-[7rem] items-center justify-center rounded-md bg-accent px-6 py-3 text-sm font-medium text-accent-fg transition hover:bg-accent/90";
const secondaryClass =
  "inline-flex min-w-[7rem] items-center justify-center rounded-md border border-stone/30 px-6 py-3 text-sm font-medium text-ink transition hover:border-ink/30";

type LandingCTAProps = {
  className?: string;
};

export function LandingCTA({ className = "" }: LandingCTAProps) {
  return (
    <div className={`flex flex-wrap items-center justify-center gap-3 ${className}`}>
      <Link href="/sign-up" className={primaryClass}>
        Sign up
      </Link>
      <a href="#how-it-works" className={secondaryClass}>
        See how it works
      </a>
    </div>
  );
}
