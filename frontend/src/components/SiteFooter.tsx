import Link from "next/link";

import { PrimaryContactPhones } from "@/components/PrimaryContactPhones";
import { buildFooterLinks } from "@/lib/footer/build-footer-links";
import { getFooterStrings } from "@/lib/i18n/footer";
import {
  resolveContactEmail,
  resolveFooterAddressLine,
  resolvePrimaryPhoneLinks,
  resolveVisitHours,
} from "@/lib/site/contact-fallbacks";
import type {
  GlobalSettingsDTO,
  Locale,
  NavigationNodeDTO,
  SocialLinkItemDTO,
} from "@/lib/cms/types";

import styles from "./SiteFooter.module.css";
import { FooterColumn } from "./FooterColumn";

type SiteFooterProps = {
  locale: Locale;
  navigation: NavigationNodeDTO[];
  settings: GlobalSettingsDTO;
  appointmentHref: string;
  socialLinks: SocialLinkItemDTO[];
};

export function SiteFooter({
  locale,
  navigation,
  settings,
  appointmentHref,
  socialLinks,
}: SiteFooterProps) {
  const t = getFooterStrings(locale);
  const groups = buildFooterLinks(navigation, locale);

  const practiceLinks = groups.services;
  const patientsFromCms = groups.patients.filter((link) => link.href !== appointmentHref);
  const patientsLinks = [{ label: t.bookOnlineLabel, href: appointmentHref }, ...patientsFromCms];
  const companyLinks = groups.company;

  const year = new Date().getFullYear();

  const footerAddress = resolveFooterAddressLine(settings, locale);
  const hours = resolveVisitHours(settings, locale);
  const email = resolveContactEmail(settings);

  const hasPractice = practiceLinks.length > 0;
  const hasPatients = patientsLinks.length > 0;
  const hasCompany = companyLinks.length > 0;
  const navColCount = [hasPractice, hasPatients, hasCompany].filter(Boolean).length;

  return (
    <footer className={`site-footer ${styles["site-footer"]}`}>
      <div className={`container ${styles["site-footer__inner"]}`}>
        <div className={styles["site-footer__grid"]}>
          <div className={styles["brand-col"]}>
            <Link href={`/${locale}`} className={styles["brand-mark"]} aria-label={t.brandLogoAlt}>
              <span className={styles["brand-glyph"]} aria-hidden="true">
                m
              </span>
              <span className={styles["brand-word"]}>myorl</span>
            </Link>
            <p className={styles["brand-tagline"]}>{settings.footerTagline ?? t.brandTagline}</p>
          </div>

          <div
            className={styles["nav-cols"]}
            data-col-count={navColCount > 0 ? String(navColCount) : undefined}
          >
            {hasPractice ? <FooterColumn label={t.practiceLabel} links={practiceLinks} /> : null}
            {hasPatients ? <FooterColumn label={t.patientsLabel} links={patientsLinks} /> : null}
            {hasCompany ? <FooterColumn label={t.companyLabel} links={companyLinks} /> : null}
          </div>

          <div className={styles["contact-col"]}>
            <p className={styles["col-label"]}>{t.contactLabel}</p>
            <div className={styles["contact-row"]}>
              <div className={styles["contact-block"]}>
                {footerAddress ? <span>{footerAddress}</span> : null}
                {hours ? <span className={styles["contact-hours"]}>{hours}</span> : null}
                {resolvePrimaryPhoneLinks(settings).length > 0 ? (
                  <span className={styles["contact-phones"]}>
                    <PrimaryContactPhones
                      locale={locale}
                      settings={settings}
                      linkClassName={styles["contact-link"]}
                      separatorClassName={styles["contact-phone-separator"]}
                    />
                  </span>
                ) : null}
                {email ? (
                  <span className={styles["contact-email"]}>
                    <a className={styles["contact-link"]} href={`mailto:${email}`}>
                      {email}
                    </a>
                  </span>
                ) : null}
              </div>
              {socialLinks.length > 0 ? (
                <ul className={styles["social-list"]} aria-label="Social media">
                  {socialLinks.map((link, index) => (
                    <li key={`${link.url}-${index}`}>
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
          <p suppressHydrationWarning>
            &copy; {year} {t.copyright}
          </p>
          <Link href={`/${locale}/sitemap`} className={styles["bottom-link"]}>
            {t.sitemapLabel}
          </Link>
        </div>
      </div>
    </footer>
  );
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
