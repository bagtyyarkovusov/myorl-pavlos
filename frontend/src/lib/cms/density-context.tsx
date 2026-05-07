"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { LayoutVariant, PageType } from "./types";
import { type Density, getDensityForPage } from "./density";

const DensityContext = createContext<Density>("focused");

type DensityProviderProps = {
  pageType: PageType;
  layoutVariant: LayoutVariant;
  children: ReactNode;
};

export function DensityProvider({ pageType, layoutVariant, children }: DensityProviderProps) {
  return (
    <DensityContext.Provider value={getDensityForPage(pageType, layoutVariant)}>
      {children}
    </DensityContext.Provider>
  );
}

export function useDensity(): Density {
  return useContext(DensityContext);
}
