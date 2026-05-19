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
