/** Tiny helpers for Encar photo URLs. */

const CDN = "https://ci.encar.com";

export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${CDN}${path}`;
}

/** Dedupe photo paths while preserving order. Encar occasionally repeats. */
export function uniquePaths<T extends { path: string }>(arr: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const p of arr) {
    if (seen.has(p.path)) continue;
    seen.add(p.path);
    out.push(p);
  }
  return out;
}

/**
 * Pick the best photo to use as a list-card thumbnail. Encar's photos[] is
 * often dealer-curated and can lead with an interior or option shot (wheel
 * close-up, dashboard, etc.). The `type` field discriminates exterior shots
 * (`OUTER`) from interior (`INNER`) and feature (`OPTION`) shots, so prefer
 * the first OUTER and only fall back to photos[0] if none is tagged.
 */
export function pickFeaturedPhoto<T extends { type?: string; path: string }>(
  photos: T[] | null | undefined,
): T | null {
  if (!photos || photos.length === 0) return null;
  const outer = photos.find((p) => p.type === "OUTER");
  return outer ?? photos[0] ?? null;
}
