/**
 * Korean -> English/Albanian translation for free-form text (inspector notes,
 * grade/trim labels, dealer comments). Backed by Google's unofficial public
 * translate endpoint — the same one the official Translate widget and most
 * browser extensions use. No API key, no billing.
 *
 * Caveats: Google can rate-limit or block our IP under heavy load and there is
 * no SLA. Callers must handle a thrown error and fall back to the original
 * Korean. Cached results live in SQLite so repeat views never hit the wire.
 */

import { db } from "./db/index.js";

export type TranslateLang = "en" | "sq";

/**
 * Google's `gtx` ("guest translate") endpoint. The dt=t flag asks only for the
 * translation text — the response is still a deeply nested array; the
 * translated segments we want sit at result[0][i][0].
 */
const GTX_URL = "https://translate.googleapis.com/translate_a/single";

async function translateViaGoogle(text: string, target: TranslateLang): Promise<string> {
  const params = new URLSearchParams({
    client: "gtx",
    sl: "ko",
    tl: target,
    dt: "t",
    q: text,
  });
  const res = await fetch(`${GTX_URL}?${params.toString()}`, {
    // The endpoint sniffs UA; passing a browser-ish one avoids the occasional
    // 403 we get with Node's default fetch UA.
    headers: { "user-agent": "Mozilla/5.0 (compatible; KAK-translate/1.0)" },
  });
  if (!res.ok) {
    throw new Error(`Google translate returned HTTP ${res.status}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("Google translate returned unexpected payload");
  }
  const segments = data[0] as unknown[];
  const out = segments
    .map((seg) => (Array.isArray(seg) && typeof seg[0] === "string" ? seg[0] : ""))
    .join("");
  if (!out.trim()) throw new Error("Google translate returned empty output");
  return out.trim();
}

/** In-process dedup so 5 concurrent renders of the same trim don't all hit Google. */
const inflight = new Map<string, Promise<string>>();

/** Translate any Korean string. Caller owns persistence. */
export async function translateKorean(text: string, target: TranslateLang = "en"): Promise<string> {
  const key = `${target}::${text}`;
  const hit = inflight.get(key);
  if (hit) return hit;
  const p = translateViaGoogle(text, target).finally(() => {
    setTimeout(() => inflight.delete(key), 1000);
  });
  inflight.set(key, p);
  return p;
}

/**
 * Translate a car's inspector-comments blob to English. Persisted on the row
 * so subsequent calls are free. Returns null if the car has no comments.
 */
export async function translateInspectionComments(carId: number): Promise<string | null> {
  const row = db()
    .prepare(
      "SELECT inspection_comments, inspection_comments_translated FROM cars WHERE car_id = ?",
    )
    .get(carId) as
    | { inspection_comments: string | null; inspection_comments_translated: string | null }
    | undefined;
  if (!row || !row.inspection_comments?.trim()) return null;
  if (row.inspection_comments_translated) return row.inspection_comments_translated;

  const english = await translateKorean(row.inspection_comments, "en").catch((e: unknown) => {
    console.error(`translateInspectionComments(${carId}) failed:`, (e as Error).message);
    return null;
  });
  if (!english) return null;

  db()
    .prepare("UPDATE cars SET inspection_comments_translated = ? WHERE car_id = ?")
    .run(english, carId);
  return english;
}

/** True when a string contains any Hangul characters and is therefore worth translating. */
function hasKorean(s: string | null | undefined): boolean {
  if (!s) return false;
  return /[가-힯ᄀ-ᇿ㄰-㆏]/.test(s);
}

/**
 * Translate the Encar grade/trim string ("2.0 디럭스" → "2.0 Deluxe") and
 * cache the result on the car row. No-op when the string is empty or already
 * Korean-free, and silently falls back to the original on network errors so
 * the page never breaks because Google rate-limited us.
 */
export async function translateGrade(carId: number): Promise<string | null> {
  const row = db()
    .prepare("SELECT grade_name, grade_translated_en FROM cars WHERE car_id = ?")
    .get(carId) as { grade_name: string | null; grade_translated_en: string | null } | undefined;
  if (!row || !row.grade_name) return null;
  if (row.grade_translated_en) return row.grade_translated_en;
  if (!hasKorean(row.grade_name)) {
    // Already English-ish — record that so we don't keep checking.
    db().prepare("UPDATE cars SET grade_translated_en = ? WHERE car_id = ?").run(row.grade_name, carId);
    return row.grade_name;
  }

  const english = await translateKorean(row.grade_name, "en").catch((e: unknown) => {
    console.warn(`translateGrade(${carId}) failed:`, (e as Error).message);
    return null;
  });
  if (!english) return null;
  db().prepare("UPDATE cars SET grade_translated_en = ? WHERE car_id = ?").run(english, carId);
  return english;
}
