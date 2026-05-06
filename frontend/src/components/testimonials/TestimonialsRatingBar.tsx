import { cn } from "@/lib/utils";

type TestimonialsRatingBarProps = {
  rating?: number | null;
  userRatingCount?: number | null;
  /** Must contain "{{count}}" for the numeric review total. */
  countTemplate: string;
  className?: string;
};

export function TestimonialsRatingBar({
  rating,
  userRatingCount,
  countTemplate,
  className,
}: TestimonialsRatingBarProps) {
  if (rating == null && userRatingCount == null) {
    return null;
  }

  const countText =
    userRatingCount != null
      ? countTemplate.replace(/\{\{count\}\}/g, String(userRatingCount))
      : null;

  return (
    <div className={cn("flex", className)}>
      <div className="inline-flex max-w-full flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-stone-line pb-2.5 text-[0.9375rem] leading-snug text-stone">
        {rating != null ? (
          <span className="font-medium tabular-nums text-ink">
            {rating.toFixed(1)}{" "}
            <span className="text-trust" aria-hidden>
              ★
            </span>
          </span>
        ) : null}
        {countText ? <span>{countText}</span> : null}
      </div>
    </div>
  );
}
