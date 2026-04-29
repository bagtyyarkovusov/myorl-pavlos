import Link from "next/link";

import { isExternalHref } from "@/components/design-system";
import type { NavigationNodeDTO } from "@/lib/cms/types";

type NavigationAnchorProps = {
  item: NavigationNodeDTO;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
};

export function NavigationAnchor({
  item,
  children,
  className,
  style,
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
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
    >
      {children ?? item.navLabel}
    </Link>
  );
}
