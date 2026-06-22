"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-ink">
      <h1 className="font-display text-2xl">Something went wrong</h1>
      <p className="mt-3 max-w-md text-center text-sm text-ink/60">
        {error.message || "The page failed to load."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition hover:bg-accent/90"
      >
        Try again
      </button>
    </main>
  );
}
