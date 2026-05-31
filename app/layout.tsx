import "./globals.css";
import { Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import { shortlistCount } from "../src/db/queries.js";
import { SiteProvider } from "./i18n/Provider";
import { getLang } from "./i18n/server";
import { Header } from "./design/Header";
import { Footer } from "./design/Footer";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = {
  // "KAK | <page>" — child pages set their `title` and Next substitutes it.
  // Pages without a title fall back to the `default`.
  title: {
    default: "KAK | Korean Automotive Kosova",
    template: "KAK | %s",
  },
  description: "Used cars from South Korea — verified, costed and imported to Kosovo.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const [sCount, lang] = await Promise.all([
    Promise.resolve(shortlistCount()),
    getLang(),
  ]);
  return (
    <html lang={lang} className={montserrat.variable}>
      <body suppressHydrationWarning className="min-h-screen">
        <SiteProvider initialLang={lang}>
          <Header shortlistCount={sCount} />
          <main>{children}</main>
          <Footer />
        </SiteProvider>
      </body>
    </html>
  );
}
