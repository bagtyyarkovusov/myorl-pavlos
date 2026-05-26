import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <meta name="robots" content="noindex" />
      <div className="page-shell">
        <header className="page-hero">
          <p className="kicker">404</p>
          <h1>Page not found</h1>
          <p className="excerpt">The page you are looking for does not exist.</p>
          <nav className="flex gap-3 mt-6" aria-label="home pages">
            <Link
              href="/el"
              className="inline-flex items-center px-4 py-2 rounded-md bg-trust text-white font-medium text-sm no-underline hover:bg-trust-ink transition-colors"
            >
              Αρχική (Ελληνικά)
            </Link>
            <Link
              href="/ru"
              className="inline-flex items-center px-4 py-2 rounded-md border border-stone-line text-ink font-medium text-sm no-underline hover:bg-bone-200 transition-colors"
            >
              Главная (Русский)
            </Link>
          </nav>
        </header>
      </div>
    </>
  );
}
