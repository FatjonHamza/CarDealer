/**
 * FX rate helper. The detail page and search cards convert listing prices
 * from KRW to EUR, and a stale hard-coded rate (1400) was off by ~25%
 * relative to the actual market (~1745 KRW per EUR as of 2026-05).
 *
 * Pulled from Frankfurter — a free ECB-data API, no auth required. Cached for
 * 6 hours via Next.js `unstable_cache` so we hit the network at most a few
 * times a day. Falls back to a recent baseline if the API is unreachable.
 */

import { unstable_cache } from "next/cache";

const FRANKFURTER_URL = "https://api.frankfurter.dev/v1/latest?base=EUR&symbols=KRW";

/**
 * Baseline rate used when the live fetch fails (network down, API rate-limited,
 * etc.). Bump this every few months so the fallback also doesn't drift.
 * As of 2026-05-27 the ECB reference was 1745.2 KRW per 1 EUR.
 */
export const FALLBACK_KRW_PER_EUR = 1745;

interface FrankfurterLatestResponse {
  amount: number;
  base: string;
  date: string;
  rates: { KRW?: number };
}

async function fetchKrwPerEur(): Promise<number> {
  try {
    // `unstable_cache` below already caches the function result, so we don't
    // need Next.js fetch-cache extensions here — keeps the typing portable.
    const res = await fetch(FRANKFURTER_URL, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return FALLBACK_KRW_PER_EUR;
    const data = (await res.json()) as FrankfurterLatestResponse;
    const rate = data?.rates?.KRW;
    return typeof rate === "number" && rate > 0 ? rate : FALLBACK_KRW_PER_EUR;
  } catch {
    return FALLBACK_KRW_PER_EUR;
  }
}

/**
 * Returns KRW per 1 EUR. Cached for 6 hours per process. Safe to call on
 * every page render — the underlying network fetch only happens after a
 * cache miss.
 */
export const getKrwPerEur = unstable_cache(fetchKrwPerEur, ["fx-krw-eur"], {
  revalidate: 6 * 60 * 60,
});

/** Convert a KRW amount to whole EUR using the supplied rate. */
export function krwToEur(krw: number | null | undefined, rate: number): number | null {
  if (krw == null) return null;
  return Math.round(krw / rate);
}

/** Format a KRW amount as a EUR display string (e.g. "€38,200"). */
export function fmtEur(krw: number | null | undefined, rate: number): string {
  const eur = krwToEur(krw, rate);
  if (eur == null) return "—";
  return `€${eur.toLocaleString()}`;
}
