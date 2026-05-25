export function SearchResultsSkeleton() {
  return (
    <div aria-label="Loading results" aria-busy="true" style={{ display: "flex", flexDirection: "column", gap: "24px", padding: "16px 0" }}>
      {[["75%", "55%"], ["60%", "45%"], ["70%", "50%"], ["65%", "40%"]].map(([titleW, subtitleW], i) => (
        <div key={i} role="status" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              width: titleW,
              height: "18px",
              borderRadius: "4px",
              background: "var(--muted, #e0e0e0)",
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              width: subtitleW,
              height: "14px",
              borderRadius: "4px",
              background: "var(--muted, #e0e0e0)",
              animation: "pulse 1.5s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
