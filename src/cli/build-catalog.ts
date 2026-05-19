/**
 * Build a catalog of every imported manufacturer on Encar + their model groups,
 * with live listing counts. Walks the iNav facet tree from a single API call.
 *
 * Output: src/data/catalog.json
 *
 * Usage: npm run catalog
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { and, c, eq, render } from "../encar/query.js";

const API_BASE = "https://api.encar.com";
const OUT = "src/data/catalog.json";

const HEADERS = {
  Accept: "application/json",
  Referer: "http://www.encar.com/",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
};

interface IFacet {
  Value: string;
  DisplayValue: string;
  Count: number;
  Expression: string;
  Refinements?: { Nodes: INode[] };
  Metadata?: { Code?: string[]; EngName?: string[] };
}
interface INode {
  Name: string;
  DisplayName: string;
  Facets: IFacet[];
}
interface IRoot {
  iNav: { Nodes: INode[] };
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return (await res.json()) as T;
}

/** Recursively find the first node with the given Name. */
function findNode(nodes: INode[], name: string): INode | null {
  for (const n of nodes) {
    if (n.Name === name) return n;
    for (const f of n.Facets) {
      if (f.Refinements?.Nodes) {
        const hit = findNode(f.Refinements.Nodes, name);
        if (hit) return hit;
      }
    }
  }
  return null;
}

interface Catalog {
  generatedAt: string;
  totalListings: number;
  brands: Record<
    string,
    {
      displayName: string;
      engName?: string;
      count: number;
      models: Record<string, { displayName: string; engName?: string; count: number }>;
    }
  >;
}

/** Fetch model groups for a single manufacturer by querying with it as a filter. */
async function fetchModelGroups(manufacturer: string): Promise<IFacet[]> {
  const q = render(and(eq("Hidden", "N"), c(eq("CarType", "N"), eq("Manufacturer", manufacturer))));
  const url = `${API_BASE}/search/car/list/general?count=true&q=${encodeURIComponent(q)}&inav=${encodeURIComponent("|Metadata|Sort")}`;
  const data = await getJson<IRoot>(url);
  const mg = findNode(data.iNav.Nodes, "ModelGroup");
  return mg?.Facets ?? [];
}

async function main() {
  console.log("Fetching imported-car facet tree...");
  // All imported (CarType.N) + visible (Hidden.N).
  const q = render(and(eq("Hidden", "N"), eq("CarType", "N")));
  const url = `${API_BASE}/search/car/list/general?count=true&q=${encodeURIComponent(q)}&inav=${encodeURIComponent("|Metadata|Sort")}`;
  const root = await getJson<IRoot & { Count: number }>(url);
  console.log(`  Total imported listings: ${root.Count.toLocaleString()}`);

  const mfgNode = findNode(root.iNav.Nodes, "Manufacturer");
  if (!mfgNode) throw new Error("No Manufacturer facet found");

  // Brands that count > 50 — skip the long tail (Acura/Scion/Mercury etc.)
  const brandFacets = mfgNode.Facets.filter((f) => f.Count >= 50);
  console.log(`\nFetching model groups for ${brandFacets.length} brands (count >= 50)...`);

  const brands: Catalog["brands"] = {};
  // Sequential to be polite — could parallelize with a small concurrency pool later
  for (const facet of brandFacets) {
    const mgFacets = await fetchModelGroups(facet.Value);
    const models: Catalog["brands"][string]["models"] = {};
    for (const mg of mgFacets) {
      if (mg.Count === 0) continue;
      models[mg.Value] = {
        displayName: mg.DisplayValue,
        engName: mg.Metadata?.EngName?.[0],
        count: mg.Count,
      };
    }
    brands[facet.Value] = {
      displayName: facet.DisplayValue,
      engName: facet.Metadata?.EngName?.[0],
      count: facet.Count,
      models,
    };
    process.stdout.write(".");
  }
  console.log();

  const catalog: Catalog = {
    generatedAt: new Date().toISOString(),
    totalListings: root.Count,
    brands,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(catalog, null, 2));

  // Print summary, sorted by count
  const sorted = Object.entries(brands).sort((a, b) => b[1].count - a[1].count);
  console.log(`\nImported brands (${sorted.length}):`);
  for (const [val, info] of sorted) {
    const eng = info.engName ? `  [${info.engName}]` : "";
    console.log(`  ${info.displayName.padEnd(18)} ${String(info.count).padStart(6)}${eng}  (key: ${val})`);
  }

  // Focused report for the user's target brands
  const target = ["BMW", "아우디", "폭스바겐"];
  console.log(`\nModel groups for target brands:`);
  for (const t of target) {
    const b = brands[t];
    if (!b) {
      console.log(`  ${t}: NOT FOUND`);
      continue;
    }
    console.log(`\n  ${t} (${b.engName ?? "?"}) — ${b.count} listings:`);
    const mgs = Object.entries(b.models).sort((a, b) => b[1].count - a[1].count);
    for (const [val, info] of mgs.slice(0, 15)) {
      const eng = info.engName ? `  [${info.engName}]` : "";
      console.log(`    ${info.displayName.padEnd(20)} ${String(info.count).padStart(5)}${eng}  (key: ${val})`);
    }
    if (mgs.length > 15) console.log(`    ... and ${mgs.length - 15} more`);
  }

  console.log(`\nWrote ${OUT}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
