"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/components/Providers";

const footerLinkClass = "text-xs leading-none text-ink/50 transition hover:text-ink";

export function CreditsLink() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace("/sign-in");
  };

  return (
    <footer className="mx-auto w-full max-w-4xl shrink-0 px-6 pb-6">
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
        <span className="text-ink/50" aria-hidden="true">
          ·
        </span>
        <button
          type="button"
          onClick={() => void handleLogout()}
          className={`${footerLinkClass} m-0 border-0 bg-transparent p-0 font-inherit`}
        >
          logout
        </button>
      </div>
    </footer>
  );
}
