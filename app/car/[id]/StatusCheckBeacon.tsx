"use client";

/**
 * Renders nothing visible. On mount, fires a background check against Encar
 * to see if the cached car is still listed. The server action revalidates the
 * detail page only if the listing_state actually changed — so most mounts are
 * no-ops and the user never sees a re-render.
 */

import { useEffect } from "react";
import { checkCarStatusAction } from "../../../src/actions.js";

export function StatusCheckBeacon({ carId }: { carId: number }) {
  useEffect(() => {
    checkCarStatusAction(carId).catch(() => {
      // Server-side errors are already swallowed inside the action; this is
      // just defense for client-side network failures.
    });
  }, [carId]);
  return null;
}
