"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useT } from "../i18n/Provider";
import { IconHeart, IconMenu, IconX, LangToggle, Logo, ThemeToggle } from "./ui";

interface Item {
  key: "home" | "browse" | "how" | "about" | "contact";
  href: string;
}

const ITEMS: Item[] = [
  { key: "home", href: "/" },
  { key: "browse", href: "/search" },
  { key: "how", href: "/#how" },
  { key: "about", href: "/about" },
  { key: "contact", href: "/contact" },
];

export function Header({ shortlistCount }: { shortlistCount: number }) {
  const t = useT();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200/70 bg-white/85 backdrop-blur-md dark:border-neutral-800/70 dark:bg-neutral-950/85">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
        <Logo />
        <nav className="mx-auto hidden items-center gap-1 lg:flex">
          {ITEMS.map((it) => {
            const active = isActive(it.href);
            return (
              <Link
                key={it.key}
                href={it.href}
                onClick={() => setOpen(false)}
                className={`rounded-full px-3.5 py-2 text-sm transition-colors ${
                  active
                    ? "text-neutral-900 dark:text-white"
                    : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {t.nav[it.key]}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <div className="hidden sm:block">
            <LangToggle />
          </div>
          <ThemeToggle />
          <Link
            href="/shortlist"
            className="relative hidden h-9 items-center gap-2 rounded-full border border-neutral-200 px-3.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-900 sm:flex"
          >
            <IconHeart size={16} filled={shortlistCount > 0} />
            {t.nav.shortlist}
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-neutral-900 px-1 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">
              {shortlistCount}
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="grid h-9 w-9 place-items-center rounded-full border border-neutral-200 text-neutral-700 dark:border-neutral-800 dark:text-neutral-300 lg:hidden"
            aria-label="Menu"
          >
            {open ? <IconX size={18} /> : <IconMenu size={18} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950 lg:hidden">
          <nav className="flex flex-col">
            {ITEMS.map((it) => (
              <Link
                key={it.key}
                href={it.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-3 text-[15px] text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-900"
              >
                {t.nav[it.key]}
              </Link>
            ))}
          </nav>
          <div className="mt-3 flex items-center justify-between border-t border-neutral-200 pt-3 dark:border-neutral-800">
            <LangToggle />
            <Link
              href="/shortlist"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300"
            >
              <IconHeart size={16} filled={shortlistCount > 0} /> {t.nav.shortlist} ({shortlistCount})
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
