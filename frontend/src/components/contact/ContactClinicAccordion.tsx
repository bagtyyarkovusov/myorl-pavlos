"use client";

import { useState } from "react";

import { CmsHtml } from "@/components/CmsHtml";
import type { ContactClinicDTO } from "@/lib/cms/types";

import styles from "./ContactClinicAccordion.module.css";

type ContactClinicAccordionProps = {
  clinics: ContactClinicDTO[];
  /** Localised label announced to screen readers on the toggle button. */
  toggleLabel?: string;
};

/**
 * Local-state accordion list of clinics. Clicking a clinic name expands its
 * detail panel; the map iframe in the parent layout is intentionally NOT
 * driven by this hook — its `src` is mounted once from `globalSettings` and
 * never reloads on selection (PRD #103 contact-map blocker-fix decision).
 */
export function ContactClinicAccordion({ clinics, toggleLabel }: ContactClinicAccordionProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (clinics.length === 0) {
    return null;
  }

  return (
    <ul className={styles.list} aria-label={toggleLabel ?? "Clinics"}>
      {clinics.map((clinic) => {
        const isOpen = expanded === clinic.name;
        const panelId = `clinic-panel-${slugify(clinic.name)}`;
        return (
          <li key={clinic.name} className={styles.item}>
            <button
              type="button"
              className={styles.toggle}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setExpanded((prev) => (prev === clinic.name ? null : clinic.name))}
              data-clinic-toggle={clinic.name}
            >
              <span className={styles.toggleLabel}>{clinic.name}</span>
              <span aria-hidden="true" className={styles.chevron}>
                {isOpen ? "−" : "+"}
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-label={clinic.name}
              hidden={!isOpen}
              className={styles.panel}
              data-clinic-panel={clinic.name}
            >
              <CmsHtml html={clinic.addressHtml} />
              {clinic.phone ? (
                <p>
                  <a href={`tel:${clinic.phone.replace(/\s+/g, "")}`}>{clinic.phone}</a>
                </p>
              ) : null}
              {clinic.email ? (
                <p>
                  <a href={`mailto:${clinic.email}`}>{clinic.email}</a>
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}
