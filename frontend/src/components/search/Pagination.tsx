"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  prevLabel: string;
  nextLabel: string;
};

export function Pagination({ currentPage, totalPages, prevLabel, nextLabel }: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const goToPage = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      if (page <= 1) {
        params.delete("page");
      } else {
        params.set("page", String(page));
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav aria-label="pagination">
      <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1}>
        {prevLabel}
      </button>
      <span>
        {currentPage} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage >= totalPages}
      >
        {nextLabel}
      </button>
    </nav>
  );
}
