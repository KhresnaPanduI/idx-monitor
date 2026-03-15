import type { Metadata } from "next";
import { Instrument_Serif, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";
import { SiteHeader } from "@/components/site-header";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
});

export const metadata: Metadata = {
  title: "IDX Holder Monitor",
  description: "Explore disclosed IDX issuer holders and investor relationships from KSEI snapshots.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${display.variable}`}>
        <div className="relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-white/70 to-transparent" />
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
