"use client";

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

const STORAGE_LANG = "kak-lang";
const STORAGE_THEME = "kak-theme";

export function SiteProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [theme, setThemeState] = useState<"light" | "dark">("light");

  // Hydrate from storage on first client mount. Server-rendered output starts
  // in EN/light to avoid hydration mismatch; we adjust after mount.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_LANG);
    if (stored === "en" || stored === "sq") setLangState(stored);
    const t = localStorage.getItem(STORAGE_THEME);
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setThemeState(t === "dark" || t === "light" ? t : prefersDark ? "dark" : "light");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_THEME, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
    localStorage.setItem(STORAGE_LANG, lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
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
