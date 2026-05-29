"use client";

import { createContext, useContext, useRef, type CSSProperties, type ReactNode } from "react";

import styles from "./SearchResultsPage.module.css";

const SearchResultsListContext = createContext<React.RefObject<HTMLDivElement | null> | null>(null);

export function SearchResultsMotionProvider({ children }: { children: ReactNode }) {
  const listRef = useRef<HTMLDivElement>(null);
  return (
    <SearchResultsListContext.Provider value={listRef}>
      {children}
    </SearchResultsListContext.Provider>
  );
}

export function useSearchResultsListRef() {
  return useContext(SearchResultsListContext);
}

export function SearchResultsList({ children }: { children: ReactNode }) {
  const listRef = useSearchResultsListRef();

  return (
    <div
      ref={listRef}
      className={styles.resultsList}
      style={{ viewTransitionName: "search-results-list" } as CSSProperties}
    >
      {children}
    </div>
  );
}
