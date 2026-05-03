import { Fragment } from "react";
import Link from "next/link";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeContactFooter } from "@/components/home/HomeContactFooter";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getHomeStrings } from "@/lib/i18n/home";
import type { NavigationNodeDTO } from "@/lib/cms/types";
import type { PageLayoutProps } from "./_shared";
import styles from "@/components/home/home.module.css";

type HomePageProps = PageLayoutProps & {
  appointmentHref: string;
  navigation: NavigationNodeDTO[];
};

const HOME_ACCESS_SLUGS = [
  "yperesies",
  "epemvaseis",
  "diagnosi",
  "klinikes",
  "timokatalogos",
  "video",
] as const;

const HOME_ACCESS_FALLBACKS: Record<
  string,
  Partial<Record<"el" | "ru", { title: string; description: string }>>
> = {
  yperesies: {
    el: {
      title: "Υπηρεσίες",
      description: "Βρείτε γρήγορα τις βασικές υπηρεσίες του ιατρείου.",
    },
    ru: {
      title: "Услуги",
      description: "Свяжитесь с нами по любой ЛОР-проблеме.",
    },
  },
  epemvaseis: {
    el: {
      title: "ΩΡΛ επεμβάσεις",
      description: "Πληροφορίες για τις χειρουργικές επιλογές και τη διαδικασία.",
    },
    ru: {
      title: "ЛОР Операции",
      description: "Операции выполняются современными минимально-травматичными методами.",
    },
  },
  diagnosi: {
    el: {
      title: "Διάγνωση",
      description: "Εξετάσεις και εξοπλισμός για γρήγορη διάγνωση και θεραπεία.",
    },
    ru: {
      title: "Диагностика",
      description: "Современное оборудование для быстрой диагностики и лечения.",
    },
  },
  klinikes: {
    el: {
      title: "Κλινικές",
      description: "Συνεργασίες με ασφαλιστικά ταμεία και κλινικές στην Αθήνα.",
    },
    ru: {
      title: "Больницы",
      description: "Сотрудничаем со страховыми и ЛОР-клиниками в Афинах и Греции.",
    },
  },
  timokatalogos: {
    el: {
      title: "Τιμοκατάλογος",
      description: "Δείτε ενδεικτικά τις διαθέσιμες υπηρεσίες.",
    },
    ru: {
      title: "Прайс-лист",
      description: "По ссылке можно оценить перечень наших услуг.",
    },
  },
  video: {
    el: {
      title: "Βίντεο",
      description: "Συλλογή ιατρικών βίντεο από εξετάσεις και επεμβάσεις.",
    },
    ru: {
      title: "Видео",
      description: "Коллекция медицинских видео из диагностических тестов и операций.",
    },
  },
};

export function HomePage({ page, appointmentHref, navigation }: HomePageProps) {
  const t = getHomeStrings(page.locale);
  const heroMedia = page.imageCenter ?? page.featuredImage ?? null;
  const firstPromoIndex = page.sections.findIndex(
    (section) => section.__component === "sections.promo-slider",
  );

  return (
    <main data-locale={page.locale}>
      <HomeHero
        kicker={t.heroKicker}
        title={t.heroTitle}
        excerpt={t.heroLead}
        media={heroMedia}
        ctaHref={appointmentHref}
        ctaLabel={t.heroCtaLabel}
      />

      {page.sections.map((section, index) => {
        const shouldRenderMenuAccess =
          section.__component === "sections.promo-slider" && index === firstPromoIndex;

        return (
          <Fragment key={`${section.__component}-${index}`}>
            <SectionRenderer context="home" section={section} locale={page.locale} />
            {shouldRenderMenuAccess ? (
              <HomeMenuAccessGrid navigation={navigation} locale={page.locale} />
            ) : null}
          </Fragment>
        );
      })}

      <HomeContactFooter
        title={t.contactFooterTitle}
        appointmentHref={appointmentHref}
        bookLabel={t.contactFooterBookLabel}
        callHref={t.contactFooterCallHref}
        callLabel={t.contactFooterCallLabel}
      />
    </main>
  );
}

function HomeMenuAccessGrid({
  navigation,
  locale,
}: {
  navigation: NavigationNodeDTO[];
  locale: "el" | "ru";
}) {
  const nodes = flattenNavigation(navigation);
  const items = HOME_ACCESS_SLUGS.flatMap((slug, index) => {
    const node = nodes.find((item) => item.slug === slug);
    if (!node) return [];
    const fallback = HOME_ACCESS_FALLBACKS[slug]?.[locale];
    return [
      {
        node,
        title: node.navLabel || fallback?.title || node.title,
        description: node.excerpt?.trim() || fallback?.description || "",
        icon: index,
      },
    ];
  });

  if (items.length === 0) return null;

  return (
    <section className={styles["menu-access-section"]} aria-label="Primary site areas">
      <div className="container mx-auto">
        <div className={styles["menu-access-grid"]}>
          {items.map(({ node, title, description, icon }) => (
            <Link className={styles["menu-access-card"]} href={node.href} key={node.documentId}>
              <span className={styles["menu-access-card__icon"]} aria-hidden="true">
                <MenuAccessIcon index={icon} />
              </span>
              <span className={styles["menu-access-card__copy"]}>
                <strong>{title}</strong>
                {description ? <span>{description}</span> : null}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function flattenNavigation(nodes: NavigationNodeDTO[]): NavigationNodeDTO[] {
  return nodes.flatMap((node) => [node, ...flattenNavigation(node.children)]);
}

function MenuAccessIcon({ index }: { index: number }) {
  const paths = [
    <path key="book" d="M8 5h8a2 2 0 0 1 2 2v12H8a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 4h5m-5 4h5" />,
    <path key="person" d="M12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Zm0 6.5v6m-4-5h8m-6 0-1 6m5-6 1 6" />,
    <path key="plus" d="M12 6v12M6 12h12" />,
    <path key="group" d="M9 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM5 18a4 4 0 0 1 8 0m-2 0a4 4 0 0 1 8 0" />,
    <path key="card" d="M5 7h14v10H5V7Zm0 3h14m-10 4h4" />,
    <path key="video" d="M5 8h10v8H5V8Zm10 3 4-2.5v7L15 13v-2Z" />,
  ];

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {paths[index] ?? paths[0]}
    </svg>
  );
}
