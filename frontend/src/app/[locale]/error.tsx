"use client";

import { useEffect } from "react";
import { unstable_rethrow } from "next/navigation";

export default function LocaleErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  unstable_rethrow(error);

  useEffect(() => {
    console.error("Locale Route Error:", error);
  }, [error]);

  const isTimeout =
    error.message.includes("aborted") ||
    error.message.includes("timeout") ||
    error.message.includes("[CMS] timeout") ||
    error.message.includes("[CMS] network");

  return (
    <div className="page-shell">
      <header className="page-hero">
        <p className="kicker">Connection Error</p>
        <h1>{isTimeout ? "Server Timeout" : "Content Unavailable"}</h1>
        <p className="excerpt">
          {isTimeout
            ? "The server took too long to respond. Please check your connection and try again."
            : "We encountered an unexpected issue while loading this page. Please try again later."}
        </p>
        <button onClick={() => reset()} className="button" style={{ marginTop: "2rem" }}>
          Try Again
        </button>
      </header>
    </div>
  );
}
