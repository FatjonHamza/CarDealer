"use client";

import Link from "next/link";
import { useT } from "../i18n/Provider";
import { IconSearch } from "./ui";

export function CtaBand() {
  const t = useT();
  return (
    <section className="bg-neutral-900 dark:bg-neutral-900">
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <h2
          className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl"
          style={{ textWrap: "balance" } as React.CSSProperties}
        >
          {t.cta.title}
        </h2>
        <p className="mx-auto mt-4 max-w-lg text-[15px] text-neutral-400">{t.cta.subtitle}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
          >
            <IconSearch size={17} />
            {t.common.findCar}
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-6 py-3.5 text-[15px] font-medium text-white transition-colors hover:bg-neutral-800"
          >
            {t.common.talkToUs}
          </Link>
        </div>
      </div>
    </section>
  );
}
