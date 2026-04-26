import Image from "next/image";

import { CmsHtml } from "@/components/CmsHtml";
import { toSocialLinkDTO } from "@/lib/cms/dto";
import type { MediaDTO, SectionDTO } from "@/lib/cms/types";

type SectionRendererProps = {
  section: SectionDTO;
};

export function SectionRenderer({ section }: SectionRendererProps) {
  return (
    <section className="section-block" data-section={section.__component}>
      <SectionHeader heading={section.heading} intro={section.intro} />
      {renderSectionBody(section)}
    </section>
  );
}

function SectionHeader({ heading, intro }: { heading?: string | null; intro?: string | null }) {
  if (!heading && !intro) {
    return null;
  }

  return (
    <header className="section-header">
      {heading ? <h2>{heading}</h2> : null}
      {intro ? <CmsHtml className="cms-html section-intro" html={intro} /> : null}
    </header>
  );
}

function renderSectionBody(section: SectionDTO) {
  switch (section.__component) {
    case "sections.promo-slider":
      return (
        <div className="card-list feature-list">
          {section.slides.map((slide, index) => (
            <article className="content-card media-card" key={`${slide.title ?? "slide"}-${index}`}>
              <ResponsiveImage media={slide.image} alt={slide.title ?? ""} />
              {slide.title ? <h3>{slide.title}</h3> : null}
              <CmsHtml html={slide.description} />
              {slide.targetUrl ? <a href={slide.targetUrl}>Open</a> : null}
            </article>
          ))}
        </div>
      );
    case "sections.linked-resources":
      return (
        <div className="card-list">
          {section.items.map((item, index) => (
            <article className="content-card" key={`${item.title ?? "resource"}-${index}`}>
              {item.title ? <h3>{item.title}</h3> : null}
              <CmsHtml html={item.description} />
              {item.targetUrl ? <a href={item.targetUrl}>Open</a> : null}
            </article>
          ))}
        </div>
      );
    case "sections.social-links":
      return (
        <ul className="inline-list">
          {section.links
            .map(toSocialLinkDTO)
            .filter((link): link is NonNullable<typeof link> => link !== null)
            .map((link) => (
              <li key={`${link.platform}-${link.url}`}>
                <a href={link.url}>{link.label}</a>
              </li>
            ))}
        </ul>
      );
    case "sections.video":
      return (
        <div className="card-list">
          {section.videos.map((video, index) => (
            <article className="content-card media-card" key={`${video.title ?? "video"}-${index}`}>
              {video.title ? <h3>{video.title}</h3> : null}
              {video.videoMp4?.url || video.videoWebm?.url ? (
                <video controls poster={video.thumbnail?.url ?? undefined}>
                  {video.videoMp4?.url ? (
                    <source src={video.videoMp4.url} type="video/mp4" />
                  ) : null}
                  {video.videoWebm?.url ? (
                    <source src={video.videoWebm.url} type="video/webm" />
                  ) : null}
                </video>
              ) : (
                <ResponsiveImage media={video.thumbnail} alt={video.title ?? ""} />
              )}
              {video.videoTags ? <p>{video.videoTags}</p> : null}
            </article>
          ))}
        </div>
      );
    case "sections.advantages":
      return (
        <div className="card-list">
          {section.items.map((item, index) => (
            <article className="content-card" key={`${item.title ?? "advantage"}-${index}`}>
              {item.icon ? <p className="kicker">{item.icon}</p> : null}
              {item.title ? <h3>{item.title}</h3> : null}
              <CmsHtml html={item.description} />
            </article>
          ))}
        </div>
      );
    case "sections.accordion":
      return <DisclosureList items={section.items.map((item) => [item.title, item.content])} />;
    case "sections.faq":
      return <DisclosureList items={section.items.map((item) => [item.question, item.answer])} />;
    case "sections.tabs":
      return (
        <div className="card-list">
          {section.items.map((item, index) => (
            <article className="content-card" key={`${item.title ?? "tab"}-${index}`}>
              {item.title ? <h3>{item.title}</h3> : null}
              <CmsHtml html={item.content} />
              {item.link ? <a href={item.link}>Open</a> : null}
            </article>
          ))}
        </div>
      );
    case "sections.gallery":
      return (
        <div className="gallery-grid">
          {section.items.map((item, index) => (
            <article
              className="content-card media-card"
              key={`${item.caption ?? "image"}-${index}`}
            >
              <ResponsiveImage
                media={item.image}
                alt={item.image?.alternativeText ?? item.caption ?? ""}
              />
              {item.caption ? <h3>{item.caption}</h3> : null}
            </article>
          ))}
        </div>
      );
    case "sections.contact":
      return (
        <div className="card-list">
          {section.details.map((detail, index) => (
            <article className="content-card" key={`${detail.type}-${index}`}>
              <h3>{detail.type}</h3>
              <CmsHtml html={detail.valueHtml} />
            </article>
          ))}
          {section.clinics.map((clinic) => (
            <article className="content-card" key={clinic.name}>
              <h3>{clinic.name}</h3>
              <CmsHtml html={clinic.addressHtml} />
              {clinic.phone ? <p>{clinic.phone}</p> : null}
              {clinic.email ? <p>{clinic.email}</p> : null}
            </article>
          ))}
        </div>
      );
  }
}

function DisclosureList({
  items,
}: {
  items: Array<[string | null | undefined, string | null | undefined]>;
}) {
  return (
    <div className="card-list">
      {items.map(([title, content], index) => (
        <details className="content-card" key={`${title ?? "item"}-${index}`}>
          <summary>{title}</summary>
          <CmsHtml html={content} />
        </details>
      ))}
    </div>
  );
}

function ResponsiveImage({ media, alt }: { media?: MediaDTO | null; alt: string }) {
  if (!media?.url) {
    return null;
  }

  return (
    <Image
      src={media.url}
      alt={alt}
      width={media.width ?? 960}
      height={media.height ?? 640}
      sizes="(min-width: 960px) 33vw, (min-width: 640px) 50vw, 100vw"
      unoptimized
    />
  );
}
