"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { DICT, type Dict, type Lang } from "./dict";

interface SiteCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  t: Dict;
}

const Ctx = createContext<SiteCtx | null>(null);

// Default to Albanian — the site is built for the Kosovo market, so first-time
// visitors land in their own language.
const DEFAULT_LANG: Lang = "sq";

const COOKIE_LANG = "kak-lang";
const STORAGE_LANG = "kak-lang"; // legacy localStorage key, migrated to cookie
const STORAGE_THEME = "kak-theme";

function readLangCookie(): Lang | null {
  if (typeof document === "undefined") return null;
  for (const c of document.cookie.split(";")) {
    const [k, ...rest] = c.trim().split("=");
    if (k === COOKIE_LANG) {
      const v = rest.join("=");
      if (v === "en" || v === "sq") return v;
    }
  }
  return null;
}

function writeLangCookie(lang: Lang): void {
  // 1-year persistence, site-wide, SameSite=Lax so it survives normal nav.
  document.cookie = `${COOKIE_LANG}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export function SiteProvider({
  children,
  initialLang,
}: {
  children: ReactNode;
  initialLang: Lang;
}) {
  const router = useRouter();
  // Start from the value the server saw (cookie) so the first paint matches
  // the server-rendered text. Hydration mismatch otherwise.
  const [lang, setLangState] = useState<Lang>(initialLang);
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Migrate the old localStorage value into the cookie so users who picked
    // a language before this change keep their preference.
    const cookieLang = readLangCookie();
    if (!cookieLang) {
      const legacy = localStorage.getItem(STORAGE_LANG);
      if (legacy === "en" || legacy === "sq") {
        writeLangCookie(legacy);
        if (legacy !== initialLang) {
          setLangState(legacy);
          router.refresh();
        }
      } else {
        // First visit — pin the cookie to the default so the next SSR sees it.
        writeLangCookie(DEFAULT_LANG);
      }
    }
    const t = localStorage.getItem(STORAGE_THEME);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setThemeState(t === "dark" || t === "light" ? t : prefersDark ? "dark" : "light");
    // initialLang is fixed for the lifetime of this component on the server.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_THEME, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    writeLangCookie(lang);
  }, [lang]);

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      writeLangCookie(l);
      // Tell Next to re-render server components with the new cookie.
      router.refresh();
    },
    [router],
  );
  const setTheme = useCallback((t: "light" | "dark") => setThemeState(t), []);

  return (
    <Ctx.Provider value={{ lang, setLang, theme, setTheme, t: DICT[lang] }}>
      {children}
    </Ctx.Provider>
  );
}

export function useSite(): SiteCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSite must be used inside SiteProvider");
  return v;
}

export function useT(): Dict {
  return useSite().t;
}
