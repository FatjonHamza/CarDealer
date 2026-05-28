import Link from "next/link";
import { manualSearchAction, manualVinSearchAction } from "../../src/actions.js";
import { findCarsByVin } from "../../src/db/queries.js";
import { modelEnglish } from "../../src/catalog-lookup.js";
import { getKrwPerEur, fmtEur } from "../../src/fx.js";

interface ManualSearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

export default async function ManualSearchPage({ searchParams }: ManualSearchPageProps) {
  const sp = await searchParams;
  const error = pickStr(sp.error);
  const vinQuery = pickStr(sp.vin);
  const vinMatches = vinQuery ? findCarsByVin(vinQuery) : [];
  const krwPerEur = vinMatches.length > 0 ? await getKrwPerEur() : 0;

  return (
    <div className="grid gap-6 max-w-3xl">
      <section>
        <h1 className="text-2xl font-bold">Manual search</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          Two ways to pull up a single car: paste an Encar listing link to fetch a fresh report from Encar +
          KIDI, or look up a VIN you&apos;ve already ingested. Both open the full detail page with specs,
          inspection, KIDI accident history, and diagnosis.
        </p>
      </section>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5">
        <h2 className="font-semibold mb-3">From an Encar link</h2>
        <form action={manualSearchAction} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Encar link or car ID</span>
            <input
              name="url"
              type="text"
              required
              autoFocus
              placeholder="http://www.encar.com/dc/dc_cardetailview.do?carid=12345678"
              className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent font-mono text-sm"
            />
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded font-medium"
            >
              Fetch & open
            </button>
            <span className="text-xs text-neutral-500">
              Hits Encar live — may take a few seconds.
            </span>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5">
        <h2 className="font-semibold mb-3">By VIN (Korea / KIDI)</h2>
        <form action={manualVinSearchAction} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">17-char VIN (or partial)</span>
            <input
              name="vin"
              type="text"
              required
              placeholder="KMHJ381EFKU123456"
              defaultValue={vinQuery ?? ""}
              maxLength={17}
              className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent font-mono text-sm uppercase"
            />
          </label>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="submit"
              className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded font-medium"
            >
              Look up VIN
            </button>
            <span className="text-xs text-neutral-500">
              Searches your local DB. Partial VIN OK (min 4 chars).
            </span>
          </div>
        </form>

        <p className="text-xs text-neutral-500 mt-4 leading-relaxed">
          <strong className="text-neutral-700 dark:text-neutral-300">Why not query KIDI directly?</strong>{" "}
          KIDI (보험개발원) doesn&apos;t expose a public VIN-lookup API — its accident-history data is only
          reachable through Encar&apos;s authenticated endpoint, which is keyed by Encar&apos;s carId, not by
          VIN. So to see KIDI history for a car, it has to be ingested first via the URL form above. After
          that, the VIN search here will find it.
        </p>
      </section>

      {error && (
        <div className="text-sm bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-900 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {vinQuery && vinMatches.length > 1 && (
        <section>
          <h2 className="font-semibold mb-2">
            {vinMatches.length} listings match VIN <code className="font-mono">{vinQuery}</code>
          </h2>
          <p className="text-xs text-neutral-500 mb-3">
            Same physical car, re-listed multiple times. Open any of them — the detail page links siblings.
          </p>
          <ul className="grid gap-2">
            {vinMatches.map((c) => (
              <li
                key={c.car_id}
                className="rounded border border-neutral-200 dark:border-neutral-800 px-3 py-2 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                <Link href={`/car/${c.car_id}`} className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className="font-medium">
                      {c.manufacturer_eng ?? c.manufacturer} {modelEnglish(c.manufacturer, c.model)}
                    </span>
                    <span className="text-neutral-500 text-sm ml-2">
                      {c.grade_english || c.grade_name || "—"}
                    </span>
                  </span>
                  <span className="text-sm font-mono whitespace-nowrap">
                    {fmtEur(c.price_won, krwPerEur)} · {c.mileage_km != null ? `${c.mileage_km.toLocaleString()} km` : "—"} · #{c.car_id}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="text-sm text-neutral-600 dark:text-neutral-400">
        <h2 className="font-semibold mb-2 text-neutral-900 dark:text-neutral-100">Accepted formats</h2>
        <ul className="grid gap-1 font-mono text-xs">
          <li>http://www.encar.com/dc/dc_cardetailview.do?carid=<span className="text-blue-600">12345678</span></li>
          <li>https://fem.encar.com/cars/detail/<span className="text-blue-600">12345678</span></li>
          <li><span className="text-blue-600">12345678</span> (just the ID)</li>
          <li><span className="text-blue-600">KMHJ381EFKU123456</span> (17-char VIN — local DB lookup)</li>
        </ul>
      </section>
    </div>
  );
}
