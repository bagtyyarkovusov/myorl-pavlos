import { CmsHtml } from "@/components/CmsHtml";
import type { SectionDTO } from "@/lib/cms/types";

type AdvantagesSection = Extract<SectionDTO, { __component: "sections.advantages" }>;

export function HomeAdvantagesSection({ section }: { section: AdvantagesSection }) {
  if (section.items.length === 0) {
    return null;
  }

  return (
    <section className="section-band home-advantages" aria-label={section.heading ?? undefined}>
      <div className="section-inner home-advantages__wrap">
        <header className="home-advantages__header">
          {section.heading ? <h2 className="home-advantages__title">{section.heading}</h2> : null}
          {section.intro ? (
            <CmsHtml className="cms-html home-advantages__intro" html={section.intro} />
          ) : null}
        </header>
        <ul className="home-advantages__grid" role="list">
          {section.items.map((item, index) => (
            <li className="home-advantages__item" key={`${item.title ?? "a"}-${index}`}>
              {item.icon ? <p className="home-advantages__icon kicker">{item.icon}</p> : null}
              {item.title ? <h3 className="home-advantages__item-title">{item.title}</h3> : null}
              {item.description ? <CmsHtml className="cms-html" html={item.description} /> : null}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
