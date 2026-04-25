"use client";

export default function ErrorPage({ error }: { error: Error }) {
  return (
    <main className="page-shell">
      <header className="page-hero">
        <p className="kicker">Error</p>
        <h1>Content could not be loaded</h1>
        <p className="excerpt">{error.message}</p>
      </header>
    </main>
  );
}
