"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { LinkedResourceItemDTO } from "@/lib/cms/types";

type HomeMedicalLedgerProps = {
  title: string;
  items: LinkedResourceItemDTO[];
  locale: string;
};

export function HomeMedicalLedger({ title, items, locale }: HomeMedicalLedgerProps) {
  if (items.length === 0) return null;

  return (
    <section className="bg-[var(--bone-50)] py-24 md:py-32">
      <div className="container mx-auto max-w-5xl">
        <header className="mb-16 md:mb-24 text-center">
          <h2 className="font-display text-4xl text-[var(--ink)] md:text-5xl lg:text-6xl">
            {title}
          </h2>
        </header>
        <ul className="flex flex-col border-t border-[var(--line)]" role="list">
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
                className="group border-b border-[var(--line)]"
              >
                <Link
                  href={href}
                  className="flex items-center justify-between py-8 transition-colors hover:bg-[var(--surface-soft)] sm:px-8 -mx-8 sm:mx-0 rounded-2xl"
                >
                  <div className="flex flex-col gap-2 max-w-2xl px-8 sm:px-0">
                    <h3 className="font-display text-2xl text-[var(--ink)] group-hover:text-[var(--accent)] transition-colors md:text-3xl">
                      {item.title}
                    </h3>
                    {item.description ? (
                      <p className="text-lg text-[var(--muted)] leading-relaxed">
                        {item.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="pr-8 sm:pr-0">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-white text-[var(--ink)] transition-all duration-300 group-hover:border-[var(--accent)] group-hover:bg-[var(--accent)] group-hover:text-white group-hover:-rotate-45">
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
      </div>
    </section>
  );
}
