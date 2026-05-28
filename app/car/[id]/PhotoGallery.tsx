"use client";

/**
 * Hero photo gallery + lightbox for the car detail page.
 *
 * Hero layout: one large image (left, spans 2 columns) + a 2x2 tile grid
 * (right). The whole thing pins to a fixed aspect ratio so the right-column
 * tiles always match the headline image's height — no jagged edges. The 5th
 * tile shows a "+N more" overlay if there are more photos.
 *
 * Clicking any tile opens a full-screen lightbox. Within the lightbox:
 *   - ← / → keys, on-screen arrow buttons, and horizontal swipe all step the
 *     current image (with wrap-around).
 *   - Esc or clicking the dimmed backdrop closes.
 *   - Body scroll is locked while open.
 */

import { useEffect, useRef, useState } from "react";

export interface GalleryPhoto {
  /**
   * Tiny 640×360 ~14 KB thumbnail (Encar bare CDN URL). Same 16:9 aspect as
   * `full`, so it slots in as a blur-up placeholder under the high-res image
   * with no layout shift when the high-res finishes loading.
   */
  thumb: string;
  /** Sharp variant used in the hero tiles (Encar `impolicy=heightRate`). */
  display: string;
  /** Full-resolution variant used in the lightbox (Encar `impolicy=widthRate`). */
  full: string;
  alt: string;
}

export function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  // Tracks which full-resolution images have finished loading. Drives the
  // opacity swap from the blurred thumb placeholder → crisp full image.
  const [loadedFull, setLoadedFull] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number | null>(null);

  const markLoaded = (idx: number) => {
    setLoadedFull((prev) => {
      if (prev.has(idx)) return prev;
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const step = (delta: number) => {
    setOpenIdx((cur) => {
      if (cur === null) return null;
      const n = photos.length;
      return (cur + delta + n) % n;
    });
  };

  // Preload immediate neighbors so navigating with arrows / swipe feels
  // instant. The has() check is what prevents duplicate fetches — `loadedFull`
  // is intentionally omitted from deps so we don't re-run on every load.
  useEffect(() => {
    if (openIdx === null) return;
    const n = photos.length;
    if (n < 2) return;
    const neighbors = [(openIdx + 1) % n, (openIdx - 1 + n) % n];
    for (const idx of neighbors) {
      if (loadedFull.has(idx)) continue;
      const img = new Image();
      img.onload = () => markLoaded(idx);
      img.src = photos[idx]!.full;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIdx, photos]);

  useEffect(() => {
    if (openIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenIdx(null);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIdx, photos.length]);

  // Lock background scroll while lightbox is open.
  useEffect(() => {
    if (openIdx === null) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [openIdx]);

  if (photos.length === 0) return null;

  const main = photos[0]!;
  const tiles = photos.slice(1, 5);
  const remaining = Math.max(0, photos.length - (1 + tiles.length));

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:aspect-[5/2]">
        <button
          type="button"
          onClick={() => setOpenIdx(0)}
          aria-label="Open photo 1 in gallery"
          className="sm:col-span-2 relative overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 h-52 sm:h-auto"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={main.display}
            alt={main.alt}
            className="w-full h-full object-cover transition-opacity hover:opacity-95"
          />
        </button>

        <div className="grid grid-cols-2 grid-rows-2 gap-2 h-36 sm:h-auto">
          {tiles.map((p, i) => {
            const isLast = i === tiles.length - 1 && remaining > 0;
            return (
              <button
                key={`${i}-${p.display}`}
                type="button"
                onClick={() => setOpenIdx(i + 1)}
                aria-label={isLast ? `Open gallery (${photos.length} photos)` : `Open photo ${i + 2}`}
                className="relative overflow-hidden rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.display} alt={p.alt} className="w-full h-full object-cover transition-opacity hover:opacity-95" />
                {isLast && (
                  <span className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-semibold text-base sm:text-lg">
                    +{remaining} more
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {openIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo gallery"
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setOpenIdx(null)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenIdx(null);
            }}
            aria-label="Close gallery"
            className="absolute z-10 top-4 right-4 w-10 h-10 rounded-full bg-black/40 hover:bg-black/60 text-white text-2xl flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            ×
          </button>

          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                aria-label="Previous photo"
                className="absolute z-10 left-2 sm:left-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/60 text-white text-3xl flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                aria-label="Next photo"
                className="absolute z-10 right-2 sm:right-6 top-1/2 -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-black/60 text-white text-3xl flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                ›
              </button>
            </>
          )}

          {/* Blur-up + high-res. The wrapper is locked to viewport size so the
              image fills the screen edge-to-edge instead of letterboxing.
              `object-cover` does a small crop where the photo's 16:9 aspect
              doesn't match the viewport (no crop on 16:9 monitors; mild
              vertical crop on 16:10 laptops; sides crop on portrait phones).
              The blurred thumb sits underneath until the full image fades in. */}
          <div
            className="relative overflow-hidden w-screen h-screen"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[openIdx]!.thumb}
              alt=""
              aria-hidden
              className={`absolute inset-0 w-full h-full object-cover select-none blur-sm scale-105 transition-opacity duration-200 ${loadedFull.has(openIdx) ? "opacity-0" : "opacity-100"}`}
              draggable={false}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={openIdx}
              src={photos[openIdx]!.full}
              alt={photos[openIdx]!.alt}
              onLoad={() => markLoaded(openIdx)}
              className={`absolute inset-0 w-full h-full object-cover select-none transition-opacity duration-200 ${loadedFull.has(openIdx) ? "opacity-100" : "opacity-0"}`}
              draggable={false}
            />
          </div>

          <div className="absolute z-10 bottom-5 left-1/2 -translate-x-1/2 text-white text-sm bg-black/60 px-3 py-1 rounded-full font-mono">
            {openIdx + 1} / {photos.length}
          </div>
        </div>
      )}
    </>
  );
}
