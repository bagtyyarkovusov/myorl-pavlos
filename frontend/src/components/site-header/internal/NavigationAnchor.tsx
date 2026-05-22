import Link from "next/link";

import { isExternalHref } from "@/components/design-system";
import type { NavigationNodeDTO } from "@/lib/cms/types";

type NavigationAnchorProps = {
  item: NavigationNodeDTO;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  "aria-label"?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
};

export function NavigationAnchor({
  item,
  children,
  className,
  style,
  "aria-label": ariaLabel,
  onClick,
  onMouseEnter,
  onFocus,
}: NavigationAnchorProps) {
  if (isExternalHref(item.href)) {
    return (
      <a
        className={className}
        style={style}
        href={item.href}
        rel="noreferrer"
        target="_blank"
        aria-label={ariaLabel}
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onFocus={onFocus}
      >
        {children ?? item.navLabel}
      </a>
    );
  }

  return (
    <Link
      className={className}
      style={style}
      href={item.href}
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
    >
      {children ?? item.navLabel}
    </Link>
  );
}
