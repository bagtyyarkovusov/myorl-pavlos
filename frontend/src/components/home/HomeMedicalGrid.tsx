"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PageSection } from "@/components/PageSection";
import type { LinkedResourceItemDTO } from "@/lib/cms/types";

import { HOME_LINK_TEXT, HOME_META_TEXT, HOME_PLAIN_CARD_SHELL } from "./style-classes";

type HomeMedicalGridProps = {
  title: string;
  items: LinkedResourceItemDTO[];
  locale: string;
};

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
};

export function HomeMedicalGrid({ title, items, locale }: HomeMedicalGridProps) {
  if (items.length === 0) return null;

  return (
    <PageSection background="surface" containerWidth="tight" heading={{ title }}>
      <motion.div
        className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6"
        variants={gridVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
      >
        {items.map((item, index) => {
          const href =
            item.targetUrl ??
            (item.targetPage?.slug ? `/${locale}/${item.targetPage.slug}` : `/${locale}/sitemap`);

          return (
            <Link key={index} href={href} className="block h-full">
              <motion.article
                variants={cardVariants}
                className={`${HOME_PLAIN_CARD_SHELL} p-6 md:p-8`}
              >
                <div className={`mb-4 ${HOME_META_TEXT}`}>{String(index + 1).padStart(2, "0")}</div>
                <h3 className="mb-3 font-display text-xl leading-tight text-ink transition-colors group-hover:text-trust md:text-2xl">
                  {item.title}
                </h3>
                {item.description ? (
                  <p className="mt-auto text-sm leading-relaxed text-stone">{item.description}</p>
                ) : null}
                <div className={`mt-6 flex items-center gap-2 ${HOME_LINK_TEXT}`}>
                  <span
                    className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1"
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>
              </motion.article>
            </Link>
          );
        })}
      </motion.div>
    </PageSection>
  );
}
