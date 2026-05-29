"use client";

import Link from "next/link";
import { useT } from "../i18n/Provider";
import { IconMail, IconPhone, IconPin, Logo } from "./ui";

const EXPLORE_HREFS = ["/search", "/#how", "/#cost", "/shortlist"];
const COMPANY_HREFS = ["/about", "/contact", "/#faq"];

export function Footer() {
  const t = useT();
  return (
    <footer className="border-t border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{t.footer.tagline}</p>
          </div>
          <div className="md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{t.footer.explore}</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {t.footer.exploreLinks.map((label, i) => (
                <li key={i}>
                  <Link href={EXPLORE_HREFS[i] ?? "/"} className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{t.footer.company}</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {t.footer.companyLinks.map((label, i) => (
                <li key={i}>
                  <Link href={COMPANY_HREFS[i] ?? "/"} className="text-neutral-600 transition-colors hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{t.footer.getInTouch}</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-neutral-600 dark:text-neutral-400">
              <li className="flex items-start gap-2.5">
                <IconPin size={16} className="mt-0.5 shrink-0 text-neutral-400" />
                <span>{t.contact.offices[0]?.address ?? ""}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <IconPhone size={16} className="shrink-0 text-neutral-400" />
                <span className="font-mono">{t.contact.phoneVal}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <IconMail size={16} className="shrink-0 text-neutral-400" />
                <span className="font-mono">{t.contact.emailVal}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-neutral-200 pt-6 text-sm text-neutral-500 dark:border-neutral-800 dark:text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{t.footer.rights}</p>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">{t.footer.privacy}</Link>
            <Link href="/" className="hover:text-neutral-900 dark:hover:text-white">{t.footer.terms}</Link>
          </div>
        </div>
        <p className="mt-4 text-xs text-neutral-400 dark:text-neutral-600">{t.footer.demo}</p>
      </div>
    </footer>
  );
}
