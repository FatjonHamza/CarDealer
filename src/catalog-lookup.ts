/**
 * Bridge the catalog (catalog.json) and the model strings Encar's per-car
 * endpoint returns. Some brands (BMW, Audi) already return English model names
 * like "X5 (G05)" or "Q7 (4M)". VW returns Korean variants like "투아렉 3세대"
 * or "뉴 투아렉" — prefix-match against the catalog to get "Touareg".
 */

import catalog from "./data/catalog.json" with { type: "json" };
import dict from "./data/dictionary.json" with { type: "json" };

interface Model {
  displayName: string;
  engName?: string;
  count: number;
}
interface Brand {
  displayName: string;
  engName?: string;
  count: number;
  models: Record<string, Model>;
}

const BRANDS = catalog.brands as unknown as Record<string, Brand>;

const SUFFIX_MAP = dict.modelSuffix as Record<string, string>;

/** Replace any Korean suffix tokens in a string with their English equivalents. */
function translateSuffixes(s: string): string {
  let out = s;
  // Sort longest-first so "더 뉴" matches before "뉴"
  const keys = Object.keys(SUFFIX_MAP).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (out.includes(k)) {
      const v = SUFFIX_MAP[k];
      if (v) out = out.split(k).join(v);
    }
  }
  return out.replace(/\s+/g, " ").trim();
}

/** Brand English name from the catalog ("아우디" → "Audi"). */
export function brandEnglish(manufacturerKey: string | null | undefined): string | null {
  if (!manufacturerKey) return null;
  const b = BRANDS[manufacturerKey];
  return b?.engName ?? null;
}

/**
 * Translate Encar's model string to English where possible.
 * - "X5 (G05)" → "X5 (G05)" (BMW already English, no change)
 * - "투아렉 3세대" → "Touareg 3세대" (VW prefix match)
 * - "뉴 투아렉" → "Touareg" (drop the "뉴" prefix when a model name matches the tail)
 * - Unknown → return the original
 */
export function modelEnglish(
  manufacturerKey: string | null | undefined,
  modelString: string | null | undefined,
): string | null {
  if (!modelString) return null;
  if (!manufacturerKey) return modelString;

  const brand = BRANDS[manufacturerKey];
  if (!brand) return modelString;

  const models = brand.models;
  // Try longest-key-first so "Q4 e-트론" beats "Q4" if both exist
  const keys = Object.keys(models).sort((a, b) => b.length - a.length);

  for (const key of keys) {
    // Exact match
    if (modelString === key) return models[key]?.engName ?? modelString;
    // Prefix match: "투아렉 3세대" starts with "투아렉"
    if (modelString.startsWith(key + " ")) {
      const suffix = translateSuffixes(modelString.slice(key.length + 1));
      const eng = models[key]?.engName;
      return eng ? `${eng} ${suffix}`.trim() : modelString;
    }
    // Tail match: "뉴 투아렉" ends with "투아렉" — the prefix is a modifier like "뉴 / 올뉴"
    if (modelString.endsWith(" " + key)) {
      const prefix = translateSuffixes(modelString.slice(0, modelString.length - key.length - 1));
      const eng = models[key]?.engName;
      if (!eng) return modelString;
      return prefix ? `${prefix} ${eng}` : eng;
    }
    // Substring match (last resort): "X5 (G05)" contains "X5"
    if (modelString.startsWith(key)) {
      const suffix = modelString.slice(key.length);
      const eng = models[key]?.engName;
      // Only use if the catalog key is English-ish OR engName equals the key (already English)
      if (eng && eng !== key) return `${eng}${suffix}`;
    }
  }

  // No catalog model matched — still translate suffix tokens if present.
  return translateSuffixes(modelString);
}

/**
 * Reverse lookup: given a brand key and free-text model search (English or Korean),
 * find the matching ModelGroup key Encar uses in its search API.
 * - "Tiguan" + brand "폭스바겐" → "티구안"
 * - "X5" + brand "BMW" → "X5"
 * Returns null if no confident match.
 */
export function findModelGroupKey(
  manufacturerKey: string | null | undefined,
  modelText: string | null | undefined,
): string | null {
  if (!manufacturerKey || !modelText) return null;
  const brand = BRANDS[manufacturerKey];
  if (!brand) return null;

  const needle = modelText.toLowerCase();
  // Two passes: prefer English match (more precise), then Korean key
  for (const [key, info] of Object.entries(brand.models)) {
    if (info.engName?.toLowerCase() === needle) return key;
  }
  for (const [key, info] of Object.entries(brand.models)) {
    if (info.engName?.toLowerCase().includes(needle)) return key;
    if (key.toLowerCase().includes(needle)) return key;
  }
  return null;
}

/** Convenience: brand + model in English when possible. */
export function displayCarName(
  manufacturerKey: string | null | undefined,
  modelString: string | null | undefined,
): string {
  const brand = brandEnglish(manufacturerKey) ?? manufacturerKey ?? "?";
  const model = modelEnglish(manufacturerKey, modelString) ?? modelString ?? "?";
  return `${brand} ${model}`;
}
