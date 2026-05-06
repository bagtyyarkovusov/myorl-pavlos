"use client";

import Link from "next/link";
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
    <PageSection
      background="default"
      containerWidth="tight"
      heading={{ title }}
      className="border-y border-stone-line"
    >
      <ul className="flex flex-col border-t border-stone-line" role="list">
        {items.map((item, index) => {
          const href =
            item.targetUrl ??
            (item.targetPage?.slug ? `/${locale}/${item.targetPage.slug}` : `/${locale}/sitemap`);

          return (
            <li key={index} className="group border-b border-stone-line">
              <Link
                href={href}
                className="flex items-center justify-between py-8 transition-colors hover:bg-bone-200/40 sm:px-8 sm:-mx-8 sm:rounded-2xl"
              >
                <div className="flex max-w-2xl flex-col gap-2">
                  <h3 className="font-display text-2xl text-ink transition-colors group-hover:text-trust md:text-3xl">
                    {item.title}
                  </h3>
                  {item.description ? (
                    <p className="text-lg leading-relaxed text-stone">{item.description}</p>
                  ) : null}
                </div>
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-stone-line bg-bone-50 text-ink transition-all duration-300 group-hover:-rotate-45 group-hover:border-trust group-hover:bg-trust group-hover:text-bone-50">
                    <span className="text-xl leading-none" aria-hidden="true">
                      →
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageSection>
  );
}
