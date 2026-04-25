import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MyORL",
    template: "%s | MyORL",
  },
  description: "Bilingual ENT and plastic surgery content powered by Strapi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el">
      <body>{children}</body>
    </html>
  );
}
