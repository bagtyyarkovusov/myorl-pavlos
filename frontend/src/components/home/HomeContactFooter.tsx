import { ButtonLink } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";

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
    <PageSection rhythm="contact" className="relative overflow-hidden bg-bone">
      <div className="pointer-events-none absolute top-0 right-0 h-[800px] w-[800px] -translate-y-1/2 translate-x-1/3 rounded-full border border-stone-line opacity-50" />

      <div className="relative z-10 text-center">
        <h2 className="mx-auto mb-12 max-w-4xl font-display text-5xl leading-tight text-ink sm:text-6xl md:text-7xl lg:text-[5.5rem]">
          {title}
        </h2>
        <div className="flex flex-col items-center justify-center gap-6 sm:flex-row">
          <ButtonLink
            href={appointmentHref}
            className="h-14 min-w-[200px] rounded-full bg-ink text-base text-bone-50 shadow-xl shadow-ink/10 transition-all duration-300 hover:scale-105 hover:bg-trust"
          >
            {bookLabel}
          </ButtonLink>
          <ButtonLink
            href={callHref}
            variant="secondary"
            className="h-14 min-w-[200px] rounded-full border-2 border-ink/20 text-base transition-all duration-300 hover:scale-105 hover:border-trust hover:bg-trust-soft hover:text-trust"
          >
            {callLabel}
          </ButtonLink>
        </div>
      </div>
    </PageSection>
  );
}
