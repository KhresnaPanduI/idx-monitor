import type { Metadata } from "next";
import { Source_Sans_3, Source_Serif_4 } from "next/font/google";

import "@/app/globals.css";
import { SiteHeader } from "@/components/site-header";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans-3",
});

const display = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif-4",
  weight: ["400", "600", "700"],
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
