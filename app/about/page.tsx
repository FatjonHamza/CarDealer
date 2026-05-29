"use client";

import { useT } from "../i18n/Provider";
import { Eyebrow } from "../design/ui";
import { CtaBand } from "../design/CtaBand";

export default function AboutPage() {
  const t = useT();
  const a = t.about;
  return (
    <>
      {/* hero */}
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="max-w-3xl">
            <Eyebrow>{a.eyebrow}</Eyebrow>
            <h1
              className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-neutral-900 dark:text-white sm:text-5xl"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {a.title}
            </h1>
            <p className="mt-6 max-w-2xl text-[17px] leading-relaxed text-neutral-600 dark:text-neutral-400">{a.lead}</p>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6">
          <div className="relative h-72 overflow-hidden rounded-2xl sm:h-[420px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero.png" alt={a.officeCaption} className="h-full w-full object-cover" />
            <div className="absolute inset-0 ring-1 ring-inset ring-black/10 dark:ring-white/10"></div>
            <span className="absolute bottom-4 left-4 rounded-full bg-white/85 px-3 py-1.5 text-xs font-medium text-neutral-700 backdrop-blur-sm dark:bg-neutral-900/85 dark:text-neutral-300">
              {a.officeCaption}
            </span>
          </div>
        </div>
      </section>

      {/* story + why korean / where */}
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7">
            <Eyebrow>{a.storyTitle}</Eyebrow>
            <div className="mt-5 space-y-5">
              {a.story.map((p, i) => (
                <p key={i} className="text-[16px] leading-relaxed text-neutral-700 dark:text-neutral-300">
                  {p}
                </p>
              ))}
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-7 dark:border-neutral-800 dark:bg-neutral-900/50">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{a.whyTitle}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{a.why}</p>
              <div className="my-6 h-px bg-neutral-200 dark:bg-neutral-800"></div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{a.whereTitle}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{a.where}</p>
            </div>
          </div>
        </div>
      </section>

      {/* what we don't do — dark band */}
      <section className="border-b border-neutral-200 bg-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/40">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
          <h2
            className="max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl"
            style={{ textWrap: "balance" } as React.CSSProperties}
          >
            {a.dontTitle}
          </h2>
          <div className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            {a.dont.map((d, i) => (
              <div key={i} className="flex items-start gap-3.5 border-t border-neutral-800 pt-5">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-neutral-800 text-neutral-400">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </span>
                <p className="text-[16px] leading-snug text-neutral-200">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* credentials + team photo placeholder */}
      <section className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-6">
            <Eyebrow>{a.credsTitle}</Eyebrow>
            <ul className="mt-6 space-y-3">
              {a.creds.map((c, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 border-b border-neutral-100 pb-3 text-[16px] text-neutral-800 dark:border-neutral-800 dark:text-neutral-200"
                >
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 6" />
                    </svg>
                  </span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-6">
            <div className="grid h-[300px] w-full place-items-center rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200 text-sm text-neutral-400 dark:from-neutral-800 dark:to-neutral-900">
              {a.teamCaption} — drop a team photo here
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
