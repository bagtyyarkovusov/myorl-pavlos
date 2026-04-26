import type { Metadata } from "next";
import { Instrument_Serif, JetBrains_Mono, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument-serif",
});

const sans = Source_Sans_3({
  subsets: ["latin", "greek", "cyrillic"],
  variable: "--font-source-sans",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
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
    <html lang="el" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
