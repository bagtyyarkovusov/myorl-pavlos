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
    userRatingCount != null ? countTemplate.replace(/\{\{count\}\}/g, String(userRatingCount)) : null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-stone-line pb-4 text-[0.9375rem] leading-snug text-stone",
        className,
      )}
    >
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
  );
}
