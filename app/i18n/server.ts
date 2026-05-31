/**
 * Server-side language helpers. The client toggles a `kak-lang` cookie; every
 * server-rendered page reads it via `getLang()` to choose the right dictionary.
 *
 * Default is Albanian — the site targets the Kosovo market and most visitors
 * land without a preference set.
 */

import { cookies } from "next/headers";
import { DICT, type Dict, type Lang } from "./dict";

const COOKIE_LANG = "kak-lang";
const DEFAULT_LANG: Lang = "sq";

export async function getLang(): Promise<Lang> {
  const store = await cookies();
  const v = store.get(COOKIE_LANG)?.value;
  return v === "en" || v === "sq" ? v : DEFAULT_LANG;
}

export async function getDict(): Promise<Dict> {
  return DICT[await getLang()];
}
