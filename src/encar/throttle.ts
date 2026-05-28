/**
 * Tiny async semaphore. Used to cap how many enrichment fetches we run in
 * parallel — Encar's `/v1/readside/*` endpoints don't throttle as aggressively
 * as `/search/*`, but firing 20 cold-cache enrichments at once still risks
 * burst-limits and slows everything down.
 */

class Semaphore {
  private queue: (() => void)[] = [];
  private active = 0;

  constructor(private readonly max: number) {}

  async acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active++;
      return () => this.release();
    }
    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve(() => this.release());
      });
    });
  }

  private release() {
    this.active--;
    const next = this.queue.shift();
    if (next) next();
  }
}

/**
 * Cap parallel per-car enrichment fetches against Encar. Each enrichment fires
 * up to 4 sub-requests (vehicle / inspection / diagnosis / accident-history),
 * so a value of 2 here keeps peak in-flight requests under ~8 — well below the
 * threshold where CloudFront starts dropping `/search/*` connections.
 */
export const ENRICH_LIMIT = new Semaphore(2);
