/**
 * Korean -> English/Albanian lookup for the enumerated values the Encar API
 * returns. Free-text fields (dealer notes, inspector comments) are NOT covered
 * here — those go through Claude (see `translate.ts`).
 *
 * Usage:
 *   import { t, tt } from "./i18n.js";
 *   t("디젤")              // "Diesel"
 *   t("디젤", "fuel")      // "Diesel" (scoped lookup; faster, fewer false hits)
 *   t("디젤", "fuel", "sq") // "Dizel"
 *
 * Albanian dictionary is sparse — when a key is missing in `dictionary-sq.json`
 * we fall back to English, then to the original Korean. That keeps the UI
 * working as we extend the Albanian coverage.
 */

import dictEn from "./data/dictionary.json" with { type: "json" };
import dictSq from "./data/dictionary-sq.json" with { type: "json" };

type Dict = typeof dictEn;
type Category = Exclude<keyof Dict, "_meta">;
export type Lang = "en" | "sq";

const CATEGORIES = (Object.keys(dictEn) as (keyof Dict)[]).filter(
  (k): k is Category => k !== "_meta",
);

function lookupOne(korean: string, category: Category, lang: Lang): string | null {
  if (lang === "sq") {
    const sqMap = (dictSq as Record<string, Record<string, string> | string>)[category];
    if (sqMap && typeof sqMap !== "string") {
      const hit = sqMap[korean];
      if (hit) return hit;
    }
  }
  const enMap = dictEn[category] as Record<string, string>;
  return enMap[korean] ?? null;
}

/** Look up a Korean term. Optionally scope to one category for precision. */
export function t(korean: string, category?: Category, lang: Lang = "en"): string | null {
  if (!korean) return null;
  if (category) return lookupOne(korean, category, lang);
  // Unscoped: try every category. First hit wins.
  for (const c of CATEGORIES) {
    const hit = lookupOne(korean, c, lang);
    if (hit) return hit;
  }
  return null;
}

/** Look up with a fallback if not found. */
export function tn(korean: string, fallback: string, category?: Category, lang: Lang = "en"): string {
  return t(korean, category, lang) ?? fallback;
}

/** Convenience: translate and return the original on miss (useful in UI). */
export function tt(korean: string, category?: Category, lang: Lang = "en"): string {
  return t(korean, category, lang) ?? korean;
}
