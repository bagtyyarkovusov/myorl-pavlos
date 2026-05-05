import { cn } from "@/lib/utils";

import styles from "./SectionGrid.module.css";

type SectionGridProps = {
  columns?: 1 | 2 | 3 | 4;
  className?: string;
  children: React.ReactNode;
};

export function SectionGrid({ columns = 1, className, children }: SectionGridProps) {
  return <div className={cn(styles.grid, styles[`cols-${columns}`], className)}>{children}</div>;
}
