"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PageSection } from "@/components/PageSection";
import type { LinkedResourceItemDTO } from "@/lib/cms/types";

type HomeMedicalLedgerProps = {
  title: string;
  items: LinkedResourceItemDTO[];
  locale: string;
};

export function HomeMedicalLedger({ title, items, locale }: HomeMedicalLedgerProps) {
  if (items.length === 0) return null;

  return (
    <PageSection background="surface" containerWidth="tight" heading={{ title }}>
      <ul className="flex flex-col border-t border-stone-line" role="list">
        {items.map((item, index) => {
          const href =
            item.targetUrl ??
            (item.targetPage?.slug ? `/${locale}/${item.targetPage.slug}` : `/${locale}/sitemap`);

          return (
            <motion.li
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] as const }}
              className="group border-b border-stone-line"
            >
              <Link
                href={href}
                className="-mx-8 flex items-center justify-between rounded-2xl py-8 transition-colors hover:bg-bone-200 sm:mx-0 sm:px-8"
              >
                <div className="flex max-w-2xl flex-col gap-2 px-8 sm:px-0">
                  <h3 className="font-display text-2xl text-ink transition-colors group-hover:text-trust md:text-3xl">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="text-lg leading-relaxed text-stone">{item.description}</p>
                  ) : null}
                </div>
                <div className="pr-8 sm:pr-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-line bg-bone-50 text-ink transition-all duration-300 group-hover:-rotate-45 group-hover:border-trust group-hover:bg-trust group-hover:text-bone-50">
                    <span className="text-xl leading-none" aria-hidden="true">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            </motion.li>
          );
        })}
      </ul>
    </PageSection>
  );
}
