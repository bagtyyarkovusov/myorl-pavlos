import type { SectionDTO } from "@/lib/cms/types";

type SectionRendererProps = {
  section: SectionDTO;
};

export function SectionRenderer({ section }: SectionRendererProps) {
  const { count, firstLabel } = describeSection(section);

  return (
    <section className="content-card" data-section={section.__component}>
      <p className="kicker">{section.__component.replace("sections.", "")}</p>
      {section.heading ? <h2>{section.heading}</h2> : null}
      <p>
        {count} item{count === 1 ? "" : "s"}
        {firstLabel ? ` — first: ${firstLabel}` : ""}
      </p>
    </section>
  );
}

function describeSection(section: SectionDTO): { count: number; firstLabel: string | null } {
  switch (section.__component) {
    case "sections.promo-slider":
      return { count: section.slides.length, firstLabel: section.slides[0]?.title ?? null };
    case "sections.linked-resources":
      return { count: section.items.length, firstLabel: section.items[0]?.title ?? null };
    case "sections.social-links":
      return { count: section.links.length, firstLabel: section.links[0]?.name ?? null };
    case "sections.video":
      return { count: section.videos.length, firstLabel: section.videos[0]?.title ?? null };
    case "sections.advantages":
      return { count: section.items.length, firstLabel: section.items[0]?.title ?? null };
    case "sections.accordion":
      return { count: section.items.length, firstLabel: section.items[0]?.title ?? null };
    case "sections.faq":
      return { count: section.items.length, firstLabel: section.items[0]?.question ?? null };
    case "sections.tabs":
      return { count: section.items.length, firstLabel: section.items[0]?.title ?? null };
    case "sections.gallery":
      return { count: section.items.length, firstLabel: section.items[0]?.caption ?? null };
    case "sections.contact":
      return {
        count: section.details.length + section.clinics.length,
        firstLabel: section.clinics[0]?.name ?? section.details[0]?.type ?? null,
      };
  }
}
