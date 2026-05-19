import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";
import { shortlistCount } from "../src/db/queries.js";

export const metadata = {
  title: "CarDealer — Encar search & due diligence",
  description: "Personal tool for searching, comparing and de-risking used cars on Encar.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const sCount = shortlistCount();
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <header className="border-b border-neutral-200 dark:border-neutral-800">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold tracking-tight">
              CarDealer
            </Link>
            <nav className="flex gap-4 text-sm text-neutral-600 dark:text-neutral-400">
              <Link href="/" className="hover:text-current">Search</Link>
              <Link href="/shortlist" className="hover:text-current">
                Shortlist{sCount > 0 && <span className="ml-1 text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded">{sCount}</span>}
              </Link>
            </nav>
            <div className="ml-auto text-xs text-neutral-500">
              Local-only · ingest with <code className="bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded">npm run ingest</code>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
