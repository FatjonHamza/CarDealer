/** Tiny inline SVG icon set. Used in the car detail stat strip. */

import type { SVGProps } from "react";

type Name =
  | "calendar"
  | "speedometer"
  | "gear"
  | "fuel"
  | "engine"
  | "body"
  | "seat"
  | "bolt"
  | "refresh";

const PATHS: Record<Name, JSX.Element> = {
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  speedometer: (
    <>
      <path d="M12 14l4-4" />
      <path d="M3 12a9 9 0 0118 0v3H3v-3z" />
      <path d="M7 18h10" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 00.4 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.4 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.9.4l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.4-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.4-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.4h.1a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.4l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.4 1.9v.1a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
    </>
  ),
  fuel: (
    <>
      <path d="M3 22V4a2 2 0 012-2h7a2 2 0 012 2v18" />
      <path d="M3 14h11" />
      <path d="M14 8h2a2 2 0 012 2v6a2 2 0 002 2 2 2 0 002-2V6.5L18 3" />
    </>
  ),
  engine: (
    <>
      <path d="M6 8h12v8H6z" />
      <path d="M6 12H3M21 12h-3M9 8V5h6v3M9 16v3h6v-3" />
    </>
  ),
  body: (
    <>
      <path d="M3 14l2-5a3 3 0 013-2h8a3 3 0 013 2l2 5v3a1 1 0 01-1 1h-2v-2H6v2H4a1 1 0 01-1-1v-3z" />
      <circle cx="7.5" cy="16.5" r="1.5" />
      <circle cx="16.5" cy="16.5" r="1.5" />
    </>
  ),
  seat: (
    <>
      <path d="M6 19v-7a3 3 0 013-3h6a3 3 0 013 3v7" />
      <path d="M4 19h16" />
    </>
  ),
  bolt: (
    <>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </>
  ),
  refresh: (
    <>
      <path d="M21 12a9 9 0 11-3.5-7.1" />
      <path d="M21 3v6h-6" />
    </>
  ),
};

export function Icon({
  name,
  size = 18,
  className,
  ...rest
}: { name: Name; size?: number; className?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
