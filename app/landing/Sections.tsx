"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useT } from "../i18n/Provider";
import {
  Accordion,
  Button,
  Eyebrow,
  Field,
  IconArrow,
  IconGrid,
  IconLock,
  IconReceipt,
  IconSearch,
  IconShield,
  Select,
  eur,
} from "../design/ui";
import { CtaBand } from "../design/CtaBand";
import type { BrandOption, FeaturedCar } from "./types";

/* Map Korean fuel string from API onto the dictionary's fuel key. */
function fuelKey(ko: string): string {
  if (!ko) return "";
  if (ko.includes("디젤")) return "diesel";
  if (ko.includes("가솔린")) return "petrol";
  if (ko.includes("플러그인")) return "hybrid";
  if (ko.includes("하이브리드")) return "hybrid";
  if (ko.includes("전기")) return "electric";
  if (ko.includes("LPG") || ko.includes("가스")) return "lpg";
  return ko;
}

/* Map Korean transmission string onto a display label. Mirrors the dict's
   transmission keys; falls back to the raw value. */
function transmissionLabel(ko: string): string {
  if (!ko) return "";
  if (ko.includes("오토") || ko.includes("자동")) return "Auto";
  if (ko.includes("수동")) return "Manual";
  if (ko.includes("CVT")) return "CVT";
  if (ko.includes("DCT")) return "DCT";
  return ko;
}

function SectionHead({ eyebrow, title, sub, center = false }: { eyebrow: string; title: string; sub?: string; center?: boolean }) {
  return (
    <div className={center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}>
      <div className={center ? "flex justify-center" : ""}>
        <Eyebrow>{eyebrow}</Eyebrow>
      </div>
      <h2
        className="mt-4 text-3xl font-semibold tracking-tight text-neutral-900 dark:text-white sm:text-[2.5rem] sm:leading-[1.1]"
        style={{ textWrap: "balance" } as React.CSSProperties}
      >
        {title}
      </h2>
      {sub && <p className="mt-4 text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">{sub}</p>}
    </div>
  );
}

function SearchModule({ brands }: { brands: BrandOption[] }) {
  const t = useT();
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [yf, setYf] = useState("");
  const [yt, setYt] = useState("");
  const [fuel, setFuel] = useState("");
  const years: number[] = [];
  for (let y = 2024; y >= 2014; y--) years.push(y);

  const currentBrand = brands.find((b) => b.key === brand);
  const models = currentBrand?.models ?? [];

  const onBrandChange = (next: string) => {
    setBrand(next);
    setModel("");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const qs = new URLSearchParams();
    if (brand) qs.set("brand", brand);
    if (model) qs.set("model", model);
    if (yf) qs.set("minYear", yf);
    if (yt) qs.set("maxYear", yt);
    if (fuel) qs.set("fuel", fuel);
    router.push(`/search${qs.toString() ? "?" + qs.toString() : ""}`);
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 sm:p-5"
    >
      <div className="mb-4 flex items-center gap-2 px-1 text-sm font-medium text-neutral-700 dark:text-neutral-300">
        <IconSearch size={17} className="text-neutral-400" />
        {t.search.title}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-12">
        <div className="col-span-2 lg:col-span-3">
          <Field label={t.search.brand}>
            <Select value={brand} onChange={(e) => onBrandChange(e.target.value)}>
              <option value="">{t.search.anyBrand}</option>
              {brands.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="col-span-2 lg:col-span-3">
          <Field label={t.search.model}>
            <Select value={model} onChange={(e) => setModel(e.target.value)}>
              <option value="">{brand ? t.search.anyModel : t.search.anyModel}</option>
              {models.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="lg:col-span-3">
          <Field label={t.search.year}>
            <div className="flex items-center gap-2">
              <Select value={yf} onChange={(e) => setYf(e.target.value)}>
                <option value="">{t.search.yearFrom}</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
              <span className="text-neutral-400">–</span>
              <Select value={yt} onChange={(e) => setYt(e.target.value)}>
                <option value="">{t.search.yearTo}</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </Select>
            </div>
          </Field>
        </div>
        <div className="lg:col-span-3">
          <Field label={t.search.fuel}>
            <Select value={fuel} onChange={(e) => setFuel(e.target.value)}>
              <option value="">{t.search.anyFuel}</option>
              {Object.entries(t.search.fuels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          href="/search"
          className="text-sm text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline dark:text-neutral-400 dark:hover:text-white"
        >
          {t.search.moreFilters}
        </Link>
        <Button type="submit" size="lg">
          <IconSearch size={17} />
          {t.search.searchBtn}
        </Button>
      </div>
    </form>
  );
}

function Hero({ brands }: { brands: BrandOption[] }) {
  const t = useT();
  return (
    <section className="relative border-b border-neutral-200 dark:border-neutral-800">
      {/* image stage */}
      <div className="relative flex min-h-[540px] items-center sm:min-h-[600px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero.png"
          alt="Korean Automotive Kosova showroom"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* two stacked gradient scrims: horizontal darken-from-left + vertical darken-from-bottom */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(8,8,9,.94) 0%, rgba(8,8,9,.78) 40%, rgba(8,8,9,.45) 72%, rgba(8,8,9,.6) 100%), linear-gradient(0deg, rgba(8,8,9,.8) 0%, rgba(8,8,9,.15) 55%, rgba(8,8,9,0) 100%)",
          }}
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-36 pt-16 sm:px-6 lg:pb-40 lg:pt-20">
          <div className="max-w-2xl">
            <div className="fade-up flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.18em] text-white/70">
              <span className="h-px w-6 bg-white/40" />
              {t.hero.eyebrow}
            </div>
            <h1
              className="fade-up mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]"
              style={{ textWrap: "balance" } as React.CSSProperties}
            >
              {t.hero.title}
              <br />
              <span className="text-white/55">{t.hero.titleAccent}</span>
            </h1>
            <p className="fade-up mt-6 max-w-xl text-[16px] leading-relaxed text-white/80">{t.hero.subtitle}</p>
            <div className="fade-up mt-7 flex flex-wrap items-center gap-x-5 gap-y-2.5">
              {t.hero.trust.map((x, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-white/90">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-emerald-500/90 text-white">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l5 5L20 6" />
                    </svg>
                  </span>
                  {x}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* search module overlaps the image bottom edge */}
      <div className="relative z-10 mx-auto -mt-24 max-w-7xl px-4 pb-14 sm:px-6 lg:-mt-28">
        <SearchModule brands={brands} />
      </div>
    </section>
  );
}

function HowItWorks() {
  const t = useT();
  return (
    <section id="how" className="scroll-mt-20 border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHead eyebrow={t.how.eyebrow} title={t.how.title} />
        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-200 dark:border-neutral-800 dark:bg-neutral-800 md:grid-cols-3">
          {t.how.steps.map((s, i) => (
            <div key={i} className="bg-white p-7 dark:bg-neutral-950">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm text-neutral-400">{s.n}</span>
                <span className="h-px flex-1 bg-neutral-200 dark:bg-neutral-800"></span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-neutral-900 dark:text-white">{s.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-neutral-500 dark:text-neutral-400">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyUs() {
  const t = useT();
  const icons = [IconShield, IconGrid, IconReceipt, IconLock];
  return (
    <section className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <SectionHead eyebrow={t.why.eyebrow} title={t.why.title} />
        <div className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {t.why.pillars.map((p, i) => {
            const I = icons[i];
            return (
              <div key={i}>
                <div className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-200 bg-white text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200">
                  {I && <I size={21} />}
                </div>
                <h3 className="mt-5 text-[16px] font-semibold text-neutral-900 dark:text-white">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">{p.body}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Featured({ cars }: { cars: FeaturedCar[] }) {
  const t = useT();
  if (cars.length === 0) return null;
  return (
    <section className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHead eyebrow={t.featured.eyebrow} title={t.featured.title} />
          <Link href="/search" className="group inline-flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-white">
            {t.common.viewAll}
            <IconArrow size={17} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {/* Mirrors the search-page `CardChrome` card: 4:3 photo, baseline
            title+price row, grade, then a wrap row with year / km / fuel /
            transmission / drivetrain badge / hp. */}
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cars.map((car) => {
            const fk = fuelKey(car.fuel);
            const fuelLabel = t.search.fuels[fk] ?? car.fuel;
            return (
              <li
                key={car.car_id}
                className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden hover:shadow-sm transition-shadow"
              >
                <Link href={`/car/${car.car_id}`} className="block">
                  {car.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={car.photo_url}
                      alt=""
                      loading="lazy"
                      className="w-full aspect-[4/3] object-cover bg-neutral-100 dark:bg-neutral-900"
                    />
                  ) : (
                    <div className="w-full aspect-[4/3] bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-xs text-neutral-400">
                      no photo
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <h3 className="font-semibold leading-tight text-neutral-900 dark:text-white">
                        {car.brand_eng} {car.model_eng}
                      </h3>
                      <span className="text-sm font-mono whitespace-nowrap text-neutral-900 dark:text-white">
                        {eur(car.price_eur)}
                      </span>
                    </div>
                    {car.grade && (
                      <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{car.grade}</div>
                    )}
                    <div className="text-xs text-neutral-500 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>{car.year}</span>
                      <span>{car.mileage_km.toLocaleString()} km</span>
                      <span>{fuelLabel}</span>
                      <span>{transmissionLabel(car.transmission)}</span>
                      {car.drivetrain && (
                        <span
                          className={
                            car.drivetrain === "4WD"
                              ? "px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                              : "px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                          }
                        >
                          {car.drivetrain}
                        </span>
                      )}
                      {car.power_hp != null && (
                        <span className="text-neutral-600 dark:text-neutral-400">{car.power_hp} hp</span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function CostBlock() {
  const t = useT();
  const [price, setPrice] = useState(22000);
  const shipping = 2150;
  const customs = (price + shipping) * 0.1;
  const excise = price * 0.07;
  const vat = (price + shipping + customs + excise) * 0.18;
  const total = price + shipping + customs + excise + vat;
  const lines = [
    { label: t.cost.lines.car, val: price, strong: true, est: false },
    { label: t.cost.lines.shipping, val: shipping, strong: false, est: false },
    { label: t.cost.lines.customs, val: customs, strong: false, est: false },
    { label: t.cost.lines.excise, val: excise, est: true, strong: false },
    { label: t.cost.lines.vat, val: vat, strong: false, est: false },
  ];
  return (
    <section id="cost" className="scroll-mt-20 border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-5">
          <SectionHead eyebrow={t.cost.eyebrow} title={t.cost.title} sub={t.cost.subtitle} />
          <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t.cost.carPriceLabel}</span>
              <span className="font-mono text-lg font-semibold text-neutral-900 dark:text-white">{eur(price)}</span>
            </div>
            <input
              type="range"
              min={8000}
              max={60000}
              step={500}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="mt-4 w-full accent-neutral-900 dark:accent-white"
              aria-label={t.cost.carPriceLabel}
            />
            <div className="mt-1 flex justify-between font-mono text-[11px] text-neutral-400">
              <span>€8,000</span>
              <span>€60,000</span>
            </div>
          </div>
        </div>
        <div className="lg:col-span-7">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {lines.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-5 py-4 sm:px-7">
                  <span className={`text-[15px] ${l.strong ? "font-medium text-neutral-900 dark:text-white" : "text-neutral-600 dark:text-neutral-400"}`}>
                    {l.label}
                    {l.est && (
                      <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                        est
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[15px] tabular-nums text-neutral-900 dark:text-neutral-100">{eur(l.val)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4 bg-neutral-900 px-5 py-5 text-white dark:bg-white dark:text-neutral-900 sm:px-7">
              <span className="text-[15px] font-semibold">{t.cost.lines.total}</span>
              <span className="font-mono text-2xl font-semibold tabular-nums">{eur(total)}</span>
            </div>
          </div>
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-neutral-500 dark:text-neutral-500">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="mt-0.5 shrink-0 text-amber-500">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" />
            </svg>
            {t.cost.disclaimer}
          </p>
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const t = useT();
  return (
    <section id="faq" className="scroll-mt-20 border-b border-neutral-200 dark:border-neutral-800">
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <SectionHead eyebrow={t.faq.eyebrow} title={t.faq.title} center />
        <div className="mt-12">
          <Accordion items={t.faq.items} />
        </div>
      </div>
    </section>
  );
}

export function LandingClient({
  brands,
  featured,
}: {
  brands: BrandOption[];
  featured: FeaturedCar[];
}): ReactNode {
  return (
    <>
      <Hero brands={brands} />
      <HowItWorks />
      <WhyUs />
      <Featured cars={featured} />
      <CostBlock />
      <Faq />
      <CtaBand />
    </>
  );
}
