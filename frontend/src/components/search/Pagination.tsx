"use client";

import { useSearchParams, usePathname } from "next/navigation";
import styles from "./Pagination.module.css";

export type PaginationProps = {
  currentPage: number;
  totalPages: number;
  prevLabel: string;
  nextLabel: string;
};

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | "...")[] = [1];
  if (current > 3) pages.push("...");
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push("...");
  pages.push(total);
  return pages;
}

function buildPageUrl(page: number, currentParams: URLSearchParams, pathname: string): string {
  const params = new URLSearchParams(currentParams.toString());
  if (page <= 1) {
    params.delete("page");
  } else {
    params.set("page", String(page));
  }
  return `${pathname}?${params.toString()}`;
}

export function Pagination({ currentPage, totalPages, prevLabel, nextLabel }: PaginationProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  if (totalPages <= 1) {
    return null;
  }

  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <nav aria-label="pagination" className={styles.nav}>
      {currentPage <= 1 ? (
        <span className={styles.disabled} aria-hidden="true">
          {prevLabel}
        </span>
      ) : (
        <a href={buildPageUrl(currentPage - 1, searchParams, pathname)} className={styles.pageLink}>
          {prevLabel}
        </a>
      )}
      {pageNumbers.map((page, idx) =>
        page === "..." ? (
          <span key={`ellipsis-${idx}`} className={styles.ellipsis}>
            ...
          </span>
        ) : (
          <a
            key={page}
            href={buildPageUrl(page, searchParams, pathname)}
            aria-current={page === currentPage ? "page" : undefined}
            className={styles.pageLink}
          >
            {page}
          </a>
        ),
      )}
      {currentPage >= totalPages ? (
        <span className={styles.disabled} aria-hidden="true">
          {nextLabel}
        </span>
      ) : (
        <a href={buildPageUrl(currentPage + 1, searchParams, pathname)} className={styles.pageLink}>
          {nextLabel}
        </a>
      )}
    </nav>
  );
}
