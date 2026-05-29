"use client";

import type { ReactNode } from "react";

import { SearchResultsMotionProvider } from "@/components/search/SearchResultsMotion";

type SearchResultsLayoutProps = {
  children: ReactNode;
};

export default function SearchResultsLayout({ children }: SearchResultsLayoutProps) {
  return <SearchResultsMotionProvider>{children}</SearchResultsMotionProvider>;
}
