export default function CmsPageLoading() {
  return (
    <main className="page-shell" aria-busy="true" aria-live="polite">
      <div className="container py-[clamp(48px,8vw,120px)]">
        <p className="eyebrow">Loading…</p>
        <div className="mt-6 h-3 max-w-[260px] rounded bg-gray-200 animate-pulse" />
        <div className="mt-8 h-2 max-w-[min(100%,520px)] rounded bg-gray-200 animate-pulse" />
        <div className="mt-3 h-2 max-w-[min(100%,420px)] rounded bg-gray-200 animate-pulse" />
      </div>
    </main>
  );
}
