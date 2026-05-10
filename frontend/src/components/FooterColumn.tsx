"use client";

import Link from "next/link";
import React from "react";

import styles from "./SiteFooter.module.css";

function SmartLink({ href, children }: { href: string; children: React.ReactNode }) {
  if (/^https?:\/\//.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return <Link href={href}>{children}</Link>;
}

export function FooterColumn({
  label,
  links,
}: {
  label: string;
  links: { label: string; href: string }[];
}) {
  const [isOpen, setIsOpen] = React.useState(true);

  React.useEffect(() => {
    const mql = window.matchMedia("(max-width: 767.98px)");
    const update = () => setIsOpen(!mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  return (
    <details className={styles["link-col"]} open={isOpen}>
      <summary className={styles["col-label"]}>{label}</summary>
      <ul className={styles["link-list"]}>
        {links.map((link, index) => (
          <li key={`${link.href}-${index}`}>
            <SmartLink href={link.href}>{link.label}</SmartLink>
          </li>
        ))}
      </ul>
    </details>
  );
}
