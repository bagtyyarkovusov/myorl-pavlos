import type { Metadata } from "next";
import { Roboto_Condensed } from "next/font/google";
import "./globals.css";
import WebVitalsReporter from "@/components/WebVitalsReporter";
import { getSiteUrl } from "@/lib/cms/site-url";

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin", "greek", "cyrillic"],
  weight: "variable",
  display: "swap",
  variable: "--font-roboto-condensed",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "MyORL",
    template: "%s | MyORL",
  },
  description:
    "Bilingual ORL/ENT and facial surgery practice in Athens — consultation content and services.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="el" className={robotoCondensed.variable} suppressHydrationWarning>
      <body>
        {children}
        <WebVitalsReporter />
      </body>
    </html>
  );
}
