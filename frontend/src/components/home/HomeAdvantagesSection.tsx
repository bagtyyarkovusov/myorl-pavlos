"use client";

import { motion } from "framer-motion";
import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
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
    <PageSection
      background="surface"
      heading={{
        title: section.heading ?? "",
        intro: section.intro ?? undefined,
      }}
      label={section.heading ?? undefined}
    >
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
            className="group relative overflow-hidden rounded-3xl border border-stone-line bg-bone p-8 transition-shadow duration-500 hover:shadow-2xl hover:shadow-trust-soft/40 md:p-10"
            key={`${item.title ?? "a"}-${index}`}
          >
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-trust-soft/20 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            <div className="relative">
              {item.icon ? (
                <span className="mb-4 inline-block font-mono text-sm uppercase tracking-[0.08em] text-trust">
                  {item.icon}
                </span>
              ) : null}
              {item.title ? (
                <h3 className="mb-2 font-display text-xl text-ink md:text-2xl">{item.title}</h3>
              ) : null}
              {item.description ? (
                <CmsHtml className="text-stone leading-relaxed" html={item.description} />
              ) : null}
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </PageSection>
  );
}
