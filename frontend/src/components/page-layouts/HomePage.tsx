import Link from "next/link";

import { CmsHtml } from "@/components/CmsHtml";
import { ButtonLink, MediaFrame, SectionHeading } from "@/components/design-system";
import { HomeAdvantagesSection } from "@/components/home/HomeAdvantagesSection";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getHomeStrings } from "@/lib/i18n/home";
import type { LinkedResourceItemDTO, PromoSlideItemDTO } from "@/lib/cms/sections";
import type { MediaDTO, PageDTO, SectionDTO } from "@/lib/cms/types";
import type { PageLayoutProps } from "./_shared";

type HomePageProps = PageLayoutProps & {
  appointmentHref: string;
};

type FocusCard = {
  title: string;
  meta: string;
  description: string;
  href: string;
};

const fallbackFocusCards: FocusCard[] = [
  {
    title: "Παθήσεις",
    meta: "Conditions",
    description:
      "Nose, throat, ear, balance, and head-neck conditions explained in practical terms.",
    href: "/el/pathiseis",
  },
  {
    title: "Παιδο-ΩΡΛ",
    meta: "Pediatric ENT",
    description: "Adenoids, tonsils, infections, allergies, and hearing care for children.",
    href: "/el/paido-orl",
  },
  {
    title: "Ενδοσκοπική χειρουργική",
    meta: "Endoscopy",
    description: "Modern endoscopic procedures for sinus, nasal, and selected head-neck problems.",
    href: "/el/endoskopiki-cheirourgiki",
  },
  {
    title: "Πλαστική προσώπου",
    meta: "Facial plastic",
    description: "Functional and aesthetic facial procedures with anatomy-first planning.",
    href: "/el/plastiki-prosopou",
  },
  {
    title: "Κλινικές",
    meta: "Clinics",
    description: "Practice locations, partner clinics, operating settings, and visit details.",
    href: "/el/klinikes",
  },
  {
    title: "Βίντεο",
    meta: "Video library",
    description: "Consultation clips, treatment explainers, and short clinical walkthroughs.",
    href: "/el/video",
  },
];

export function HomePage({ page, appointmentHref }: HomePageProps) {
  const t = getHomeStrings(page.locale);
  const heroMedia = page.imageCenter ?? page.featuredImage;
  const clinicImageFromCms = findClinicImageFromSections(page);
  const aboutColumnMedia = pickAboutMedia(page) ?? clinicImageFromCms;
  const heroTitle = getHomeHeroTitle(page);
  const advantagesSection = page.sections.find(
    (section): section is Extract<SectionDTO, { __component: "sections.advantages" }> =>
      section.__component === "sections.advantages",
  );
  const focusCards = getFocusCards(page);
  const articleCards = getArticleCards(page);
  const videoSection = page.sections.find((section) => section.__component === "sections.video");
  const firstVideoThumb = getFirstVideoThumbnailOnly(videoSection);
  const videoBlockMedia = firstVideoThumb ?? clinicImageFromCms;
  const remainingSections = page.sections.filter(
    (section) =>
      section.__component !== "sections.linked-resources" &&
      section.__component !== "sections.promo-slider" &&
      section.__component !== "sections.advantages" &&
      section.__component !== "sections.video",
  );
  const topicStat =
    focusCards.length > 0 ? String(Math.min(focusCards.length, 10)) : t.statTopicsFallback;
  const entLinks = entZoneLinks(focusCards, page.locale, t);
  const contactHref = `/${page.locale}/epikoinonia`;
  const sitemapHref = `/${page.locale}/sitemap`;
  const videoHref = `/${page.locale}/video`;

  return (
    <main className="home-shell" data-locale={page.locale}>
      <section className="home-hero" aria-labelledby="home-hero-title">
        <div className="home-hero__glow" aria-hidden="true" />
        <div className="container home-hero__inner">
          <div>
            <p className="eyebrow">{t.heroKicker}</p>
            <h1 id="home-hero-title">
              {heroTitle} <span className="accent">{t.heroHighlightWord}</span> {t.heroTagline}
            </h1>
            {page.excerpt ? <p className="home-hero__copy">{page.excerpt}</p> : null}
            <div className="home-hero__actions">
              <ButtonLink href={contactHref}>{t.ctaBook}</ButtonLink>
              <ButtonLink href={sitemapHref} variant="secondary">
                {t.ctaExplore}
              </ButtonLink>
            </div>
          </div>
          <div className="hero-media">
            <MediaFrame
              media={heroMedia}
              alt={heroMedia?.alternativeText ?? page.title}
              label={t.mediaLabelHero}
              priority
              variant="portrait"
            />
            <div className="stat-grid" aria-label={t.visitTitle}>
              <span>
                <strong>{t.statYearsValue}</strong>
                {t.statYears}
              </span>
              <span>
                <strong>{t.statLangsValue}</strong>
                {t.statLangs}
              </span>
              <span>
                <strong>{topicStat}</strong>
                {t.statTopics}
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="credential-strip" aria-label="Credentials">
        <div className="credential-track">
          {[...t.credentials, ...t.credentials].map((credential, index) => (
            <span key={`${credential}-${index}`}>— {credential}</span>
          ))}
        </div>
      </div>

      <section className="ent-strip" aria-label={t.entStripLabel}>
        <div className="section-inner ent-strip__inner">
          <p className="ent-strip__label ph-label">{t.entStripLabel}</p>
          <ul className="ent-strip__zones">
            {entLinks.map((item, entIdx) => (
              <li key={`${entIdx}-${item.label}`}>
                <Link className="ent-strip__link" href={item.href}>
                  <span className="ent-strip__dot" aria-hidden="true" />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section-band">
        <div className="section-inner">
          <SectionHeading
            eyebrow={t.categoriesEyebrow || undefined}
            title={
              <>
                {t.categoriesTitleLine1} <span className="accent">{t.categoriesTitleAccent}</span>{" "}
                {t.categoriesTitleLine2}
              </>
            }
            action={
              <Link className="u-link" href={sitemapHref}>
                {t.sitemapCta}
              </Link>
            }
          />
          <div className="focus-grid home-focus-grid" data-entrance>
            {focusCards.map((card, index) => (
              <Link
                className="focus-card"
                data-stagger={index}
                href={card.href}
                key={`${card.title}-${index}`}
              >
                <span className="focus-card__top">
                  {card.meta ? <span className="focus-card__meta">{card.meta}</span> : <span />}
                  <span className="focus-card__chevron" aria-hidden="true">
                    →
                  </span>
                </span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {advantagesSection ? <HomeAdvantagesSection section={advantagesSection} /> : null}

      {hasAboutBlock(page) ? (
        <section className="section-band">
          <div className="section-inner editorial-split">
            {aboutColumnMedia ? (
              <MediaFrame
                media={aboutColumnMedia}
                alt={aboutColumnMedia.alternativeText ?? page.title}
                label={t.mediaLabelAbout}
                variant="portrait"
              />
            ) : (
              <div className="editorial-spacer" aria-hidden="true" />
            )}
            <div className="editorial-copy">
              <p className="eyebrow">{t.aboutEyebrow}</p>
              <h2>
                {t.aboutTitleLine1} <span className="accent">{t.aboutTitleAccent}</span>{" "}
                {t.aboutTitleLine2}
              </h2>
              {page.content?.trim() ? <CmsHtml html={page.content} /> : null}
              {page.excerpt && !page.content?.trim() ? (
                <p className="excerpt-like">{page.excerpt}</p>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section-band">
        <div className="section-inner two-column-list home-visit-section">
          <div>
            <p className="eyebrow">{t.visitEyebrow}</p>
            <h2>{t.visitTitle}</h2>
            <p className="home-visit-lead">{t.visitLeadIn}</p>
            <ul className="link-list">
              {focusCards.slice(0, 5).map((card) => (
                <li key={card.title}>
                  <Link href={card.href}>
                    <span>{card.title}</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="home-practice-h2">{t.practiceFocusTitle}</h2>
            <p className="home-practice-focus">{t.practiceFocusBlurb}</p>
            <ButtonLink href={appointmentHref}>{t.ctaBook}</ButtonLink>
          </div>
        </div>
      </section>

      <section className="section-band dark-cta">
        <div className="section-inner">
          <div>
            <p className="eyebrow">{t.videoEyebrow}</p>
            <h2>
              {t.videoTitleLine1} <span className="accent">{t.videoTitleAccent}</span>{" "}
              {t.videoTitleLine2}
            </h2>
            <p>{t.videoBody}</p>
            <ButtonLink href={videoHref}>{t.videoCta}</ButtonLink>
          </div>
          <MediaFrame
            media={videoBlockMedia}
            alt={videoBlockMedia?.alternativeText ?? t.mediaLabelVideo}
            label={t.mediaLabelVideo}
            variant="wide"
          />
        </div>
      </section>

      {articleCards.length > 0 ? (
        <section className="section-band">
          <div className="section-inner">
            <SectionHeading
              eyebrow={t.journalEyebrow || undefined}
              title={
                <>
                  {t.journalTitleLine1} <span className="accent">{t.journalTitleAccent}</span>{" "}
                  {t.journalTitleLine2}
                </>
              }
              intro={t.journalIntro}
            />
            <div className="article-grid" data-entrance>
              {articleCards.slice(0, 5).map((card, index) => (
                <Link
                  className={`article-card ${index === 0 ? "article-card--featured" : ""}`}
                  href={card.href}
                  key={`${card.title}-${index}`}
                  data-stagger={index}
                >
                  <div>
                    {index === 0 ? <p className="ph-label">{t.featuredLabel}</p> : null}
                    <h3>{card.title}</h3>
                    <p>{card.description}</p>
                  </div>
                  <span aria-hidden="true">→</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {remainingSections.length > 0 ? (
        <div className="section-inner home-remaining">
          {remainingSections.map((section, index) => (
            <SectionRenderer
              key={`${section.__component}-${index}`}
              context="home"
              section={section}
            />
          ))}
        </div>
      ) : null}
    </main>
  );
}

function hasAboutBlock(page: PageDTO): boolean {
  return Boolean(page.content?.trim() || page.excerpt?.trim());
}

function getFirstVideoThumbnailOnly(videoSection: SectionDTO | undefined): MediaDTO | null {
  if (videoSection?.__component !== "sections.video") {
    return null;
  }
  return videoSection.videos[0]?.thumbnail ?? null;
}

function findClinicImageFromSections(page: PageDTO): MediaDTO | null {
  for (const section of page.sections) {
    if (section.__component === "sections.gallery") {
      for (const item of section.items) {
        if (item.image?.url) {
          return item.image;
        }
      }
    }
    if (section.__component === "sections.promo-slider") {
      for (const slide of section.slides) {
        if (slide.image?.url) {
          return slide.image;
        }
      }
    }
  }
  return null;
}

/** Match focus cards to Ear / Nose / Throat by title, href, description; fill gaps in card order. */
function entZoneLinks(
  cards: FocusCard[],
  locale: string,
  t: ReturnType<typeof getHomeStrings>,
): Array<{ label: string; href: string }> {
  const labels: [string, string, string] = [t.zoneA, t.zoneB, t.zoneC];
  const sitemap = `/${locale}/sitemap`;
  if (cards.length === 0) {
    return labels.map((label) => ({ label, href: sitemap }));
  }

  const zoneMatchers = [
    /(ωτ|αυτ|αυτι|ear|aφτί|oτί|otit|отит|ухо|akous|ακο)/i,
    /(ριν|ρίν|μυτη|μύτ|nose|нос|синус|rhin|sinus|νασ|nasal)/i,
    /(λάρ|λαι|lary|phary|throat|глот|faryng|λαρ|γλω|γλωτ|laryn)/i,
  ];
  const used = new Set<string>();
  const hay = (c: FocusCard) => `${c.title} ${c.href} ${c.description}`;

  return labels.map((label, i) => {
    const m = zoneMatchers[i]!;
    const matched = cards.find((c) => m.test(hay(c)) && !used.has(c.href));
    if (matched) {
      used.add(matched.href);
      return { label, href: matched.href };
    }
    const next = cards.find((c) => !used.has(c.href));
    if (next) {
      used.add(next.href);
      return { label, href: next.href };
    }
    return { label, href: sitemap };
  });
}

function pickAboutMedia(page: PageDTO): MediaDTO | null {
  const hero = page.imageCenter ?? page.featuredImage;
  const a = page.featuredImage;
  const b = page.imageCenter;
  if (!a?.url && !b?.url) {
    return null;
  }
  if (a?.url && b?.url && a.url === b.url) {
    return null;
  }
  if (b?.url && b.url !== hero?.url) {
    return b;
  }
  if (a?.url && a.url !== hero?.url) {
    return a;
  }
  return null;
}

function getFocusCards(page: PageDTO): FocusCard[] {
  const locale = page.locale;
  const linkedBlocks = page.sections.filter((s) => s.__component === "sections.linked-resources");
  const primaryLinked = linkedBlocks[0];
  const cards: FocusCard[] = [];

  for (const section of page.sections) {
    if (section.__component === "sections.linked-resources") {
      if (primaryLinked && section === primaryLinked) {
        cards.push(...sectionToFocusCards(section, locale));
      }
    } else if (section.__component === "sections.promo-slider") {
      cards.push(...sectionToFocusCards(section, locale));
    }
  }

  return cards.length > 0 ? cards.slice(0, 6) : localizedFallbackCards(page);
}

function getArticleCards(page: PageDTO): FocusCard[] {
  const locale = page.locale;
  const linkedBlocks = page.sections.filter((s) => s.__component === "sections.linked-resources");
  if (linkedBlocks.length >= 2) {
    return sectionToFocusCards(linkedBlocks[1]!, locale).filter(
      (card) => card.href !== `/${locale}/sitemap`,
    );
  }
  return linkedBlocks
    .flatMap((section) => sectionToFocusCards(section, locale))
    .filter((card) => card.href !== `/${locale}/sitemap`);
}

function sectionToFocusCards(section: SectionDTO, locale: string): FocusCard[] {
  if (section.__component === "sections.linked-resources") {
    return section.items.map((item) => itemToCard(item, "Resource", locale));
  }

  if (section.__component === "sections.promo-slider") {
    return section.slides.map((item) => itemToCard(item, "Feature", locale));
  }

  return [];
}

function itemToCard(
  item: LinkedResourceItemDTO | PromoSlideItemDTO,
  meta: string,
  locale: string,
): FocusCard {
  return {
    title: item.title ?? meta,
    meta,
    description: stripHtml(item.description) || "Clinical information from MyORL.",
    href:
      item.targetUrl ??
      (item.targetPage?.slug ? `/${locale}/${item.targetPage.slug}` : `/${locale}/sitemap`),
  };
}

function localizedFallbackCards(page: PageDTO): FocusCard[] {
  return fallbackFocusCards.map((card) => ({
    ...card,
    href: card.href.replace("/el/", `/${page.locale}/`),
  }));
}

function stripHtml(value?: string | null): string {
  return (value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getHomeHeroTitle(page: PageDTO): string {
  const normalizedTitle = page.title.trim().toLowerCase();

  if (normalizedTitle !== "menu" && normalizedTitle !== "меню") {
    return page.title;
  }

  return page.locale === "ru" ? "ЛОР-забота в Афинах" : "Φροντίδα ωτορινολαρυγγική";
}
