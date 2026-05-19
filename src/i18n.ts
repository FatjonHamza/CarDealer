/**
 * Tiny Korean -> English lookup for the enumerated values the Encar API returns.
 * Free-text fields (dealer notes, inspector comments) are NOT covered here —
 * those need an external translation service, called on demand.
 *
 * Usage:
 *   import { t, tn } from "./i18n.js";
 *   t("디젤")              // "Diesel"
 *   t("디젤", "fuel")      // "Diesel" (scoped lookup; faster, fewer false hits)
 *   tn("오토", "Manual")   // "Auto" — fallback if Korean key not found
 */

import dict from "./data/dictionary.json" with { type: "json" };

type Dict = typeof dict;
type Category = Exclude<keyof Dict, "_meta">;

const CATEGORIES = (Object.keys(dict) as (keyof Dict)[]).filter(
  (k): k is Category => k !== "_meta",
);

/** Look up a Korean term. Optionally scope to one category for precision. */
export function t(korean: string, category?: Category): string | null {
  if (!korean) return null;
  if (category) {
    const map = dict[category] as Record<string, string>;
    return map[korean] ?? null;
  }
  // Unscoped: try every category. First hit wins.
  for (const c of CATEGORIES) {
    const map = dict[c] as Record<string, string>;
    if (korean in map) return map[korean] ?? null;
  }
  return null;
}

/** Look up with a fallback if not found. */
export function tn(korean: string, fallback: string, category?: Category): string {
  return t(korean, category) ?? fallback;
}

/** Convenience: translate and return the original on miss (useful in UI). */
export function tt(korean: string, category?: Category): string {
  return t(korean, category) ?? korean;
}
