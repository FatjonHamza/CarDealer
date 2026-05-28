/** Tiny helpers for Encar photo URLs. */

const CDN = "https://ci.encar.com";

export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith("http") ? path : `${CDN}${path}`;
}

/**
 * Encar's CDN serves the same source image at multiple qualities via the
 * `impolicy` query param. The bare URL returns a 640×360 ~14 KB thumbnail
 * (visibly soft when zoomed). Verified sizes (carpicture03/pic3753 sample):
 *   - "thumb"  → 640×360,   ~14 KB  (bare URL — fine for tiny list cards)
 *   - "medium" → 1160×696,  ~47 KB  (sharp at hero / tile sizes)
 *   - "full"   → 2200×1238, ~870 KB (CDN ignores `rw` and returns originals;
 *                                    use only for the lightbox so we don't
 *                                    burn ~1 MB per thumbnail)
 * The watermark is baked in server-side at every size — there's no clean
 * way to strip it via URL params.
 */
export type PhotoSize = "thumb" | "medium" | "full";

export function photoUrlSized(
  path: string | null | undefined,
  size: PhotoSize,
): string | null {
  if (!path) return null;
  const base = path.startsWith("http") ? path : `${CDN}${path}`;
  switch (size) {
    case "thumb":
      return base;
    case "medium":
      return `${base}?impolicy=heightRate&rh=696&cw=1160&ch=696&cg=Center`;
    case "full":
      // `rw` is honored as a cap but Encar caps at the original width, so we
      // just request a large number and get the source resolution back.
      return `${base}?impolicy=widthRate&rw=2200`;
  }
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
