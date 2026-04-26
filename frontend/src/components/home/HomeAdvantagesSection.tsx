"use client";

import { motion } from "framer-motion";
import { CmsHtml } from "@/components/CmsHtml";
import type { SectionDTO } from "@/lib/cms/types";

type AdvantagesSection = Extract<SectionDTO, { __component: "sections.advantages" }>;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export function HomeAdvantagesSection({ section }: { section: AdvantagesSection }) {
  if (section.items.length === 0) {
    return null;
  }

  return (
    <section
      className="bg-[var(--surface)] py-20 md:py-32"
      aria-label={section.heading ?? undefined}
    >
      <div className="container mx-auto">
        <header className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          {section.heading ? (
            <h2 className="font-display text-4xl leading-tight text-[var(--ink)] md:text-5xl lg:text-6xl max-w-2xl">
              {section.heading}
            </h2>
          ) : null}
          {section.intro ? (
            <CmsHtml className="max-w-xl text-lg text-[var(--muted)]" html={section.intro} />
          ) : null}
        </header>

        <motion.ul
          className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 lg:gap-8"
          role="list"
          variants={containerVariants}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
        >
          {section.items.map((item, index) => (
            <motion.li
              variants={cardVariants}
              className="group relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--background)] p-8 transition-shadow duration-500 hover:shadow-2xl hover:shadow-[var(--trust-soft)]/40 md:p-10"
              key={`${item.title ?? "a"}-${index}`}
            >
              {/* Subtle hover gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--trust-soft)]/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100 pointer-events-none" />

              {item.icon ? (
                <div
                  className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-soft)] text-2xl text-[var(--trust)] transition-transform duration-500 group-hover:scale-110"
                  aria-hidden="true"
                >
                  {item.icon}
                </div>
              ) : null}
              {item.title ? (
                <h3 className="mb-4 font-display text-2xl text-[var(--ink)] md:text-3xl">
                  {item.title}
                </h3>
              ) : null}
              {item.description ? (
                <CmsHtml className="relative z-10 text-[var(--muted)]" html={item.description} />
              ) : null}
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
