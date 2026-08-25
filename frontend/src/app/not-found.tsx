import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brass">404</p>
      <h1 className="mt-2 font-display text-3xl tracking-tight text-teal-deep sm:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 text-sm text-ink-muted">
        The page you requested does not exist or may have been moved.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-full bg-teal-deep px-5 py-2.5 text-sm font-medium text-white transition hover:bg-teal-mid"
      >
        Back to home
      </Link>
    </main>
  );
}
