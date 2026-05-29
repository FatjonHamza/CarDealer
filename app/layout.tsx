import "./globals.css";
import { Montserrat } from "next/font/google";
import type { ReactNode } from "react";
import { shortlistCount } from "../src/db/queries.js";
import { SiteProvider } from "./i18n/Provider";
import { Header } from "./design/Header";
import { Footer } from "./design/Footer";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

export const metadata = {
  title: "Korean Automotive Kosova",
  description: "Used cars from South Korea — verified, costed and imported to Kosovo.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const sCount = shortlistCount();
  return (
    <html lang="en" className={montserrat.variable}>
      <body suppressHydrationWarning className="min-h-screen">
        <SiteProvider>
          <Header shortlistCount={sCount} />
          <main>{children}</main>
          <Footer />
        </SiteProvider>
      </body>
    </html>
  );
}
