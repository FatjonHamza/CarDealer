/**
 * Encar API recon.
 *
 * Opens a real Encar search, intercepts every network response, and ALSO
 * directly calls the JSON API to guarantee we capture a populated payload.
 *
 * Run: npm run recon
 * Headless: HEADLESS=1 npm run recon
 */

import { chromium, type Response } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const HEADLESS = process.env.HEADLESS === "1";
const STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const OUT = join("recon", "dumps", STAMP);

// Encar query expression. CarType.N = imported (수입), CarType.Y = domestic.
// 158k domestic, 66k imported, A=all.
const QUERY_EXPR =
  "(And.Hidden.N._.(C.CarType.N._.(C.Manufacturer.BMW._.ModelGroup.X5.)))";

const FRAGMENT = JSON.stringify({
  action: QUERY_EXPR,
  toggle: {},
  layer: "",
  sort: "ModifiedDate",
  page: 1,
  limit: 20,
  searchKey: "",
});

const SEARCH_URL = `http://www.encar.com/fc/fc_carsearchlist.do?carType=for#!${encodeURIComponent(FRAGMENT)}`;

// Direct API call — bypasses the JS app, guarantees we see populated results
const API_LIST_URL = `https://api.encar.com/search/car/list/premium?count=true&q=${encodeURIComponent(QUERY_EXPR)}&sr=${encodeURIComponent("|ModifiedDate|0|20")}`;

type Captured = {
  index: number;
  url: string;
  status: number;
  contentType: string;
  method: string;
  bodyFile: string | null;
  bytes: number;
};

async function main() {
  await mkdir(join(OUT, "responses"), { recursive: true });
  await mkdir(join(OUT, "screenshots"), { recursive: true });
  await mkdir(join(OUT, "html"), { recursive: true });

  console.log(`Recon dump dir: ${OUT}`);
  console.log(`Headless: ${HEADLESS}`);
  console.log(`Query: ${QUERY_EXPR}`);

  const browser = await chromium.launch({ headless: HEADLESS });
  const context = await browser.newContext({
    locale: "ko-KR",
    timezoneId: "Asia/Seoul",
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const captured: Captured[] = [];
  let i = 0;

  page.on("response", async (res: Response) => {
    const idx = i++;
    const url = res.url();
    const ct = res.headers()["content-type"] ?? "";
    const method = res.request().method();
    const status = res.status();

    const interesting =
      ct.includes("json") ||
      ct.includes("javascript") ||
      ct.includes("text/html");

    let bodyFile: string | null = null;
    let bytes = 0;

    if (interesting && status >= 200 && status < 400) {
      try {
        const body = await res.body();
        bytes = body.length;
        const ext = ct.includes("json")
          ? "json"
          : ct.includes("html")
            ? "html"
            : "js";
        const safeHost = new URL(url).hostname.replace(/[^a-z0-9.-]/gi, "_");
        bodyFile = `responses/${String(idx).padStart(4, "0")}_${safeHost}.${ext}`;
        await writeFile(join(OUT, bodyFile), body);
      } catch {
        /* redirect/empty bodies */
      }
    }

    captured.push({ index: idx, url, status, contentType: ct, method, bytes, bodyFile });
  });

  console.log("\n[1/3] Navigating to Encar search...");
  await page.goto(SEARCH_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(4_000);

  await page.screenshot({
    path: join(OUT, "screenshots", "01_search_results.png"),
    fullPage: true,
  });
  await writeFile(join(OUT, "html", "01_search_results.html"), await page.content());

  // Direct API call from the same browser context — same cookies, same headers
  console.log("\n[2/3] Direct API call...");
  try {
    const apiResp = await page.request.get(API_LIST_URL, {
      headers: {
        Referer: "http://www.encar.com/fc/fc_carsearchlist.do?carType=for",
        Accept: "application/json",
      },
    });
    const body = await apiResp.body();
    await writeFile(join(OUT, "responses", "9999_direct_api_list.json"), body);
    console.log(`  status=${apiResp.status()} bytes=${body.length}`);
  } catch (e) {
    console.log(`  Direct API call failed: ${(e as Error).message}`);
  }

  // Try several selectors for the first listing
  console.log("\n[3/3] Locating first car listing...");
  const candidates = [
    'a[href*="/cars/detail/"]',
    'a[href*="carid="]',
    'a[href*="/dc/dc_cardetailview"]',
    'a[href*="cardetail"]',
    "[data-itemid] a",
    "tr[data-index] a",
    ".car_list a",
    "#sr_normal a",
  ];

  let detailHref: string | null = null;
  for (const sel of candidates) {
    const count = await page.locator(sel).count();
    if (count > 0) {
      const href = await page.locator(sel).first().getAttribute("href");
      console.log(`  ${sel} -> ${count} match(es), first href: ${href}`);
      if (href && !detailHref) detailHref = href;
    } else {
      console.log(`  ${sel} -> 0`);
    }
  }

  if (detailHref) {
    const absUrl = detailHref.startsWith("http")
      ? detailHref
      : `http://www.encar.com${detailHref}`;
    console.log(`\nNavigating to detail: ${absUrl}`);
    try {
      await page.goto(absUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
      await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {});
      await page.waitForTimeout(3_000);
      await page.screenshot({
        path: join(OUT, "screenshots", "02_detail.png"),
        fullPage: true,
      });
      await writeFile(join(OUT, "html", "02_detail.html"), await page.content());
    } catch (e) {
      console.log(`Detail nav failed: ${(e as Error).message}`);
    }
  }

  await writeFile(
    join(OUT, "manifest.json"),
    JSON.stringify(
      { searchUrl: SEARCH_URL, apiListUrl: API_LIST_URL, query: QUERY_EXPR, stamp: STAMP, captured },
      null,
      2,
    ),
  );

  console.log(`\nDone. Captured ${captured.length} responses.`);
  console.log(`Dump: ${OUT}`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
