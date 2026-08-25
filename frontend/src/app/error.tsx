"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">Error</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight text-teal-deep sm:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 text-sm text-ink-muted">
        An unexpected error occurred while loading this page.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex rounded-full bg-teal-deep px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-mid"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex rounded-full border border-teal-deep/20 px-5 py-2.5 text-sm font-medium text-teal-deep transition hover:bg-teal-mist"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}
