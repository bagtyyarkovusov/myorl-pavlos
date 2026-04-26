import { ButtonLink } from "@/components/design-system";

type HomeContactFooterProps = {
  title: string;
  appointmentHref: string;
  bookLabel: string;
  callHref: string;
  callLabel: string;
};

export function HomeContactFooter({
  title,
  appointmentHref,
  bookLabel,
  callHref,
  callLabel,
}: HomeContactFooterProps) {
  return (
    <section className="bg-[var(--bone)] py-32 md:py-48 relative overflow-hidden">
      {/* Decorative large circle */}
      <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] rounded-full border border-[var(--line)] opacity-50 pointer-events-none" />

      <div className="container relative z-10 mx-auto text-center">
        <h2 className="mx-auto mb-12 max-w-4xl font-display text-5xl leading-tight text-[var(--ink)] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          {title}
        </h2>
        <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
          <ButtonLink
            href={appointmentHref}
            className="min-w-[200px] h-14 text-base rounded-full bg-[var(--ink)] text-white hover:bg-[var(--accent)] hover:scale-105 transition-all duration-300 shadow-xl shadow-[var(--ink)]/10"
          >
            {bookLabel}
          </ButtonLink>
          <ButtonLink
            href={callHref}
            variant="secondary"
            className="min-w-[200px] h-14 text-base rounded-full border-2 border-[var(--ink)]/20 hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] hover:scale-105 transition-all duration-300"
          >
            {callLabel}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
