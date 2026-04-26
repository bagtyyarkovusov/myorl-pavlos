export default function LocaleLoading() {
  return (
    <main className="home-shell" aria-busy="true" aria-live="polite">
      <div className="container" style={{ padding: "clamp(48px, 8vw, 120px) 0" }}>
        <p className="eyebrow">…</p>
        <div
          style={{
            marginTop: 24,
            height: 12,
            maxWidth: 260,
            borderRadius: 4,
            background: "var(--color-bone-200)",
          }}
        />
        <div
          style={{
            marginTop: 32,
            height: 8,
            maxWidth: "min(100%, 520px)",
            borderRadius: 4,
            background: "var(--color-bone-200)",
          }}
        />
        <div
          style={{
            marginTop: 12,
            height: 8,
            maxWidth: "min(100%, 420px)",
            borderRadius: 4,
            background: "var(--color-bone-200)",
          }}
        />
      </div>
    </main>
  );
}
