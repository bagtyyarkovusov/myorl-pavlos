import Link from "next/link";

import { getFooterStrings } from "@/lib/i18n/footer";
import {
  resolveContactEmail,
  resolveFooterAddressLine,
  resolvePhoneDisplay,
  resolvePhoneTel,
} from "@/lib/site/contact-fallbacks";
import type {
  GlobalSettingsDTO,
  Locale,
  NavigationNodeDTO,
  SocialLinkItemDTO,
} from "@/lib/cms/types";

import styles from "./SiteFooter.module.css";

type SiteFooterProps = {
  locale: Locale;
  navigation: NavigationNodeDTO[];
  settings: GlobalSettingsDTO;
  appointmentHref: string;
  socialLinks: SocialLinkItemDTO[];
};

const PRACTICE_SLUGS = ["yperesies", "epemvaseis", "diagnosi", "video"] as const;
const PATIENTS_SLUGS = ["klinikes", "timokatalogos"] as const;

export function SiteFooter({
  locale,
  navigation,
  settings,
  appointmentHref,
  socialLinks,
}: SiteFooterProps) {
  const t = getFooterStrings(locale);
  const flat = flattenNavigation(navigation);

  const practiceLinks = PRACTICE_SLUGS.flatMap((slug) => {
    const node = flat.find((n) => n.slug === slug);
    return node ? [{ label: node.navLabel || node.title, href: node.href }] : [];
  });

  const patientsLinks = [
    { label: t.bookOnlineLabel, href: appointmentHref },
    ...PATIENTS_SLUGS.flatMap((slug) => {
      const node = flat.find((n) => n.slug === slug);
      return node ? [{ label: node.navLabel || node.title, href: node.href }] : [];
    }),
  ];

  const year = new Date().getFullYear();
  const footerAddress = resolveFooterAddressLine(settings, locale);
  const phoneDisplay = resolvePhoneDisplay(settings);
  const phoneTel = resolvePhoneTel(settings);
  const email = resolveContactEmail();

  return (
    <footer className={styles["site-footer"]}>
      <div className={`container ${styles["site-footer__inner"]}`}>
        <div className={styles["site-footer__grid"]}>
          <div className={styles["brand-col"]}>
            <Link
              href={`/${locale}`}
              className={styles["brand-mark"]}
              aria-label={t.brandLogoAlt}
            >
              <span className={styles["brand-glyph"]} aria-hidden="true">
                m
              </span>
              <span className={styles["brand-word"]}>myorl</span>
            </Link>
            <p className={styles["brand-tagline"]}>{t.brandTagline}</p>
          </div>

          <div className={styles["nav-cols"]}>
            <div className={styles["link-col"]}>
              <p className={styles["col-label"]}>{t.practiceLabel}</p>
              <ul className={styles["link-list"]}>
                {practiceLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles["link-col"]}>
              <p className={styles["col-label"]}>{t.patientsLabel}</p>
              <ul className={styles["link-list"]}>
                {patientsLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={styles["contact-col"]}>
            <p className={styles["col-label"]}>{t.contactLabel}</p>
            <div className={styles["contact-row"]}>
              <address className={styles["contact-block"]}>
                <span>{footerAddress}</span>
                <span>
                  <a href={`tel:${phoneTel}`}>{phoneDisplay}</a>
                  <span aria-hidden="true"> · </span>
                  <a href={`mailto:${email}`}>{email}</a>
                </span>
              </address>
              {socialLinks.length > 0 ? (
                <ul className={styles["social-list"]} aria-label="Social media">
                  {socialLinks.map((link) => (
                    <li key={link.url}>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.name}
                        title={link.name}
                      >
                        <SocialIcon name={link.name} />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles["site-footer__bottom"]}>
          <p>
            © {year} {t.copyright}
          </p>
          <Link href={`/${locale}/sitemap`} className={styles["bottom-link"]}>
            {t.sitemapLabel}
          </Link>
        </div>
      </div>
    </footer>
  );
}

function flattenNavigation(nodes: NavigationNodeDTO[]): NavigationNodeDTO[] {
  return nodes.flatMap((node) => [node, ...flattenNavigation(node.children)]);
}

function SocialIcon({ name }: { name: string }) {
  const key = name.toLowerCase();
  if (key.includes("facebook")) return <FacebookIcon />;
  if (key.includes("instagram")) return <InstagramIcon />;
  if (key.includes("youtube")) return <YouTubeIcon />;
  if (key.includes("google")) return <GoogleIcon />;
  if (key.includes("twitter") || key === "x") return <TwitterIcon />;
  if (key.includes("linkedin")) return <LinkedInIcon />;
  return <GlobeIcon />;
}

const baseSvgProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

function FacebookIcon() {
  return (
    <svg {...baseSvgProps}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg {...baseSvgProps}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M16 11.37a4 4 0 1 1-7.91 1.18A4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg {...baseSvgProps}>
      <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z" />
      <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg {...baseSvgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8M12 8v8" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg {...baseSvgProps}>
      <path d="M22 4.01c-1 .49-1.98.689-3 .99-1.121-1.265-2.783-1.335-4.38-.737S11.977 6.323 12 8v1c-3.245.083-6.135-1.395-8-4 0 0-4.182 7.433 4 11-1.872 1.247-3.739 2.088-6 2 3.308 1.803 6.913 2.423 10.034 1.517 3.58-1.04 6.522-3.723 7.651-7.742a13.84 13.84 0 0 0 .497-3.753c0-.249 1.51-2.772 1.818-4.013z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg {...baseSvgProps}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg {...baseSvgProps}>
      <circle cx="12" cy="12" r="9" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <path d="M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}
