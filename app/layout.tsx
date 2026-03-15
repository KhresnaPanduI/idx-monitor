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
        <div className="relative overflow-hidden min-h-screen">
          <SiteHeader />
          <main className="mx-auto w-full max-w-7xl px-6 lg:px-8 pb-12 pt-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
