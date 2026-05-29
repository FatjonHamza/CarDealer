"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useSite } from "../i18n/Provider";

/* ----- icons (stroke, currentColor) ----- */
interface IcProps {
  size?: number;
  className?: string;
  fill?: string;
  sw?: number;
  children?: ReactNode;
  d?: string;
}

export function Ic({ d, size = 20, fill = "none", sw = 1.6, children, className }: IcProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {d ? <path d={d} /> : children}
    </svg>
  );
}

export const IconShield = (p: IcProps) => <Ic {...p} d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z M9 12l2 2 4-4" />;
export const IconGrid = (p: IcProps) => (
  <Ic {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </Ic>
);
export const IconReceipt = (p: IcProps) => <Ic {...p} d="M5 3h14v18l-2.5-1.5L14 21l-2-1.5L10 21l-2.5-1.5L5 21V3z M9 8h6 M9 12h6 M9 16h3" />;
export const IconLock = (p: IcProps) => (
  <Ic {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Ic>
);
export const IconSearch = (p: IcProps) => (
  <Ic {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4-4" />
  </Ic>
);
export const IconSun = (p: IcProps) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Ic>
);
export const IconMoon = (p: IcProps) => <Ic {...p} d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />;
export const IconChevron = (p: IcProps) => <Ic {...p} d="M6 9l6 6 6-6" />;
export const IconArrow = (p: IcProps) => <Ic {...p} d="M5 12h14M13 6l6 6-6 6" />;
export const IconMenu = (p: IcProps) => <Ic {...p} d="M4 7h16M4 12h16M4 17h16" />;
export const IconX = (p: IcProps) => <Ic {...p} d="M6 6l12 12M18 6L6 18" />;
export const IconPhone = (p: IcProps) => <Ic {...p} d="M4 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L20 14l5 2v4a2 2 0 0 1-2 2A18 18 0 0 1 2 6a2 2 0 0 1 2-2z" />;
export const IconMail = (p: IcProps) => (
  <Ic {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 7l9 6 9-6" />
  </Ic>
);
export const IconPin = (p: IcProps) => (
  <Ic {...p}>
    <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Ic>
);
export const IconClock = (p: IcProps) => (
  <Ic {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Ic>
);
export const IconChat = (p: IcProps) => <Ic {...p} d="M21 11.5a8.5 8.5 0 0 1-12.3 7.6L3 21l1.9-5.7A8.5 8.5 0 1 1 21 11.5z" />;

export function IconHeart({ filled, ...p }: IcProps & { filled?: boolean }) {
  return <Ic {...p} fill={filled ? "currentColor" : "none"} d="M12 20s-7-4.5-9.5-9A4.8 4.8 0 0 1 12 6a4.8 4.8 0 0 1 9.5 5c-2.5 4.5-9.5 9-9.5 9z" />;
}

/* ----- small UI primitives ----- */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
      <span className="h-px w-6 bg-neutral-300 dark:bg-neutral-700"></span>
      {children}
    </div>
  );
}

interface ButtonProps {
  children: ReactNode;
  variant?: "primary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
  disabled?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  type = "button",
  className = "",
  disabled,
}: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-medium rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-neutral-900 dark:focus-visible:ring-neutral-100 dark:focus-visible:ring-offset-neutral-950 disabled:opacity-50";
  const sizes = { md: "text-sm px-5 py-2.5", lg: "text-[15px] px-6 py-3.5", sm: "text-sm px-4 py-2" };
  const variants = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200",
    outline: "border border-neutral-300 text-neutral-900 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-100 dark:hover:bg-neutral-900",
    ghost: "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-white dark:hover:bg-neutral-900",
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

const SELECT_CLS = "w-full appearance-none rounded-xl border border-neutral-300 bg-white px-3.5 py-3 text-sm text-neutral-900 transition-colors hover:border-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-neutral-600 dark:focus:border-neutral-300";

export function Select({
  value,
  onChange,
  name,
  children,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  name?: string;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select name={name} value={value} onChange={onChange} className={SELECT_CLS + " pr-9"}>
        {children}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400">
        <IconChevron size={16} />
      </span>
    </div>
  );
}

/* ----- Logo (real KoreanAutomotiveKosova SVG; tinted via `brightness` so it
   adapts to light vs dark theme — the source SVG is white on transparent). ----- */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Korean Automotive Kosova — home" className={`shrink-0 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.svg"
        alt="Korean Automotive Kosova"
        className="h-6 w-auto brightness-0 dark:brightness-100 sm:h-7"
      />
    </Link>
  );
}

/* ----- toggles ----- */
export function LangToggle() {
  const { lang, setLang } = useSite();
  return (
    <div className="flex items-center rounded-full border border-neutral-200 p-0.5 text-xs font-medium dark:border-neutral-800">
      {(["en", "sq"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={`rounded-full px-2.5 py-1 uppercase tracking-wide transition-colors ${
            lang === l
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useSite();
  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="grid h-9 w-9 place-items-center rounded-full border border-neutral-200 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-white"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <IconSun size={17} /> : <IconMoon size={17} />}
    </button>
  );
}

/* ----- accordion ----- */
export function Accordion({ items }: { items: readonly { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <div className="divide-y divide-neutral-200 border-y border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              className="flex w-full items-center justify-between gap-4 py-5 text-left"
            >
              <span className="text-[16px] font-medium text-neutral-900 dark:text-white sm:text-[17px]">{it.q}</span>
              <span className={`shrink-0 text-neutral-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                <IconChevron size={20} />
              </span>
            </button>
            <div className={`acc-body ${isOpen ? "open" : ""}`}>
              <div>
                <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-neutral-600 dark:text-neutral-400">{it.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-US");
