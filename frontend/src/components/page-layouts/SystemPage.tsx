import { PageBody } from "./PageBody";
import { PageHeader } from "./_shared";
import type { PageDTO } from "@/lib/cms/types";

import layoutStyles from "./_shared.module.css";

export function SystemPage({ page }: { page: PageDTO }) {
  return (
    <div className={layoutStyles["page-shell"]}>
      <div className="container">
        <PageHeader
          page={page}
          kicker={null}
          showHeroImage={Boolean(page.imageCenter ?? page.featuredImage)}
        />
        <PageBody page={page} proseStackGap="compact" />
      </div>
    </div>
  );
}
