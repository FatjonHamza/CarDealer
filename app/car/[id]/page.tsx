import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrFetchCar, isInShortlist, isStatusStale } from "../../../src/db/queries.js";
import { StatusCheckBeacon } from "./StatusCheckBeacon.js";
import { tt, type Lang } from "../../../src/i18n.js";
import { toggleShortlistAction, refreshCarAction, translateInspectionAction } from "../../../src/actions.js";
import { brandEnglish, modelEnglish } from "../../../src/catalog-lookup.js";
import { getKrwPerEur, fmtEur } from "../../../src/fx.js";
import { photoUrlSized, uniquePaths } from "../../../src/photo.js";
import { Icon } from "../../components/Icon.js";
import { PhotoGallery, type GalleryPhoto } from "./PhotoGallery.js";
import { VehicleDetailsModal, type DetailRow } from "./VehicleDetailsModal.js";
import { InspectionReportModal } from "./InspectionReportModal.js";
import type { InspectionRecord } from "../../../src/encar/types.js";
import ENCAR_OPTIONS from "../../../src/data/encar-options.json" with { type: "json" };
import { getDict, getLang } from "../../i18n/server";
import type { Dict } from "../../i18n/dict";

type CarT = Dict["car"];

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export async function generateMetadata({ params }: DetailPageProps) {
  const { id } = await params;
  const carId = Number(id);
  if (!Number.isFinite(carId)) return { title: `#${id}` };
  const car = await getOrFetchCar(carId).catch(() => null);
  if (!car) return { title: `#${carId}` };
  const brand = car.manufacturer_eng ?? brandEnglish(car.manufacturer) ?? car.manufacturer ?? "";
  const model = modelEnglish(car.manufacturer, car.model) || car.model || "";
  const label = `${brand} ${model}`.trim();
  return { title: label ? `${label} (#${carId})` : `#${carId}` };
}

// Encar's own category order for the "View all options" panel.
const OPTION_CATEGORY_ORDER = [
  "Exterior / Interior",
  "Safety",
  "Convenience / Multimedia",
  "Seats",
  "Other",
];

// Korean panel-title -> English. Encar's panel dictionary is keyed by codes like
// HOOD/FRONT_FENDER_LEFT, but real `outers` data comes back with Korean titles
// (e.g. "후드", "프론트 휀더(좌)"), so we translate by title here.
const PANEL_KO_EN: Record<string, string> = {
  "후드": "Hood",
  "프론트 휀더(좌)": "Front fender (L)",
  "프론트 휀더(우)": "Front fender (R)",
  "프론트 도어(좌)": "Front door (L)",
  "프론트 도어(우)": "Front door (R)",
  "리어 도어(좌)": "Rear door (L)",
  "리어 도어(우)": "Rear door (R)",
  "트렁크 리드": "Trunk lid",
  "루프": "Roof",
  "쿼터 패널(좌)": "Quarter panel (L)",
  "쿼터 패널(우)": "Quarter panel (R)",
  "사이드실 패널(좌)": "Rocker panel (L)",
  "사이드실 패널(우)": "Rocker panel (R)",
  "프론트 사이드 멤버(좌)": "Front side member (L)",
  "프론트 사이드 멤버(우)": "Front side member (R)",
  "인사이드 패널(좌)": "Inside panel (L)",
  "인사이드 패널(우)": "Inside panel (R)",
  "라디에이터 서포트(볼트체결부품)": "Radiator support (bolt-on)",
  "리어 패널": "Rear panel",
  "프론트 패널": "Front panel",
  "프론트 범퍼": "Front bumper",
  "리어 범퍼": "Rear bumper",
};

const PANEL_STATUS_BY_CODE: Record<string, string> = {
  X: "Replaced",
  W: "Bodywork / welded",
  WC: "Welded & cut",
  C: "Corrosion",
  A: "Scratch",
  U: "Dent",
};

interface ChangedPanel {
  panel: string;
  panelKo: string;
  statuses: { en: string; ko: string }[];
}

interface RawOuter {
  type?: { code?: string; title?: string };
  statusTypes?: { code?: string; title?: string }[];
}

function collectChangedPanels(inspection: InspectionRecord, lang: Lang): ChangedPanel[] {
  const outers = (inspection.outers ?? []) as unknown as RawOuter[];
  return outers.map((o) => {
    const panelKo = o.type?.title ?? o.type?.code ?? "?";
    // Prefer the curated Korean→English/Albanian dictionary; for English keep
    // the existing static map as the canonical source so wording matches the
    // panel diagram labels.
    const panelLocalized = lang === "sq"
      ? tt(panelKo, "panel", "sq")
      : (PANEL_KO_EN[panelKo] ?? tt(panelKo, "panel", "en"));
    const statuses = (o.statusTypes ?? []).map((s) => {
      const ko = s.title ?? s.code ?? "?";
      const en = (s.code && PANEL_STATUS_BY_CODE[s.code]) ?? ko;
      return { en, ko };
    });
    return { panel: panelLocalized, panelKo, statuses };
  });
}

function statusFill(status: string | undefined): string {
  switch (status) {
    case "Replaced": return "#dc2626";
    case "Welded & cut": return "#b91c1c";
    case "Bodywork / welded": return "#ea580c";
    case "Dent": return "#f97316";
    case "Corrosion": return "#ca8a04";
    case "Scratch": return "#facc15";
    case undefined: return "#9ca3af";
    default: return "#9ca3af";
  }
}

const PANEL_BASE_FILL = "#e5e7eb";

function CarPanelDiagram({ panels, t }: { panels: ChangedPanel[]; t: CarT }) {
  const byPanel = new Map<string, ChangedPanel>();
  for (const p of panels) byPanel.set(p.panelKo, p);

  const fillFor = (panelKo: string): string => {
    const p = byPanel.get(panelKo);
    if (!p) return PANEL_BASE_FILL;
    return statusFill(p.statuses[0]?.en);
  };

  const titleFor = (panelKo: string, fallback: string): string => {
    const p = byPanel.get(panelKo);
    if (!p) return fallback;
    const status = p.statuses.map((s) => s.en).join(", ") || t.panels.damaged;
    return `${p.panel} — ${status}`;
  };

  const Panel = ({
    panelKo,
    label,
    x,
    y,
    width,
    height,
    rx = 4,
    showLabel = true,
  }: {
    panelKo: string;
    label: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rx?: number;
    showLabel?: boolean;
  }) => {
    const hit = byPanel.has(panelKo);
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          rx={rx}
          fill={fillFor(panelKo)}
          stroke="#525252"
          strokeWidth={1}
          opacity={hit ? 1 : 0.55}
        >
          <title>{titleFor(panelKo, label)}</title>
        </rect>
        {showLabel && (
          <text
            x={x + width / 2}
            y={y + height / 2 + 3}
            textAnchor="middle"
            fontSize={9}
            fill={hit ? "#fff" : "#525252"}
            pointerEvents="none"
          >
            {label}
          </text>
        )}
      </g>
    );
  };

  const INNER_KO = [
    "라디에이터 서포트(볼트체결부품)",
    "프론트 사이드 멤버(좌)",
    "프론트 사이드 멤버(우)",
    "인사이드 패널(좌)",
    "인사이드 패널(우)",
    "리어 패널",
    "프론트 패널",
  ];
  const innerHits = INNER_KO.map((k) => byPanel.get(k)).filter(
    (p): p is ChangedPanel => !!p,
  );

  const legendEntries = Array.from(
    new Set(
      panels.flatMap((p) => p.statuses.map((s) => s.en)).concat(
        panels.some((p) => p.statuses.length === 0) ? [t.panels.damaged] : [],
      ),
    ),
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <svg
          viewBox="0 0 300 480"
          className="w-full max-w-[260px] sm:max-w-[220px]"
          role="img"
          aria-label="Car panel damage diagram"
        >
          <Panel panelKo="프론트 범퍼" label="F Bumper" x={20} y={4} width={260} height={22} rx={10} />
          <Panel panelKo="프론트 휀더(좌)" label="F Fender L" x={10} y={30} width={60} height={80} />
          <Panel panelKo="후드" label="Hood" x={75} y={30} width={150} height={80} />
          <Panel panelKo="프론트 휀더(우)" label="F Fender R" x={230} y={30} width={60} height={80} />
          <Panel panelKo="프론트 도어(좌)" label="F Door L" x={10} y={115} width={60} height={80} />
          <Panel panelKo="프론트 도어(우)" label="F Door R" x={230} y={115} width={60} height={80} />
          <Panel panelKo="리어 도어(좌)" label="R Door L" x={10} y={200} width={60} height={80} />
          <Panel panelKo="리어 도어(우)" label="R Door R" x={230} y={200} width={60} height={80} />
          <rect x={75} y={115} width={150} height={165} rx={6} fill="none" stroke="#a3a3a3" strokeDasharray="4 3" />
          <text x={150} y={200} textAnchor="middle" fontSize={10} fill="#737373">Roof</text>
          <Panel panelKo="쿼터 패널(좌)" label="Quarter L" x={10} y={285} width={60} height={80} />
          <Panel panelKo="트렁크 리드" label="Trunk lid" x={75} y={285} width={150} height={80} />
          <Panel panelKo="쿼터 패널(우)" label="Quarter R" x={230} y={285} width={60} height={80} />
          <Panel panelKo="사이드실 패널(좌)" label="" x={0} y={115} width={8} height={250} rx={2} showLabel={false} />
          <Panel panelKo="사이드실 패널(우)" label="" x={292} y={115} width={8} height={250} rx={2} showLabel={false} />
          <Panel panelKo="리어 범퍼" label="R Bumper" x={20} y={370} width={260} height={22} rx={10} />
        </svg>

        <div className="text-xs grid gap-1 min-w-[160px]">
          <div className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">{t.panels.legend}</div>
          {legendEntries.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded border border-neutral-400"
                style={{ backgroundColor: statusFill(status === t.panels.damaged ? undefined : status) }}
              />
              <span className="text-neutral-700 dark:text-neutral-300">{status}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 mt-1">
            <span
              className="inline-block w-3 h-3 rounded border border-neutral-400"
              style={{ backgroundColor: PANEL_BASE_FILL }}
            />
            <span className="text-neutral-500">{t.panels.untouched}</span>
          </div>
          {innerHits.length > 0 && (
            <div className="mt-2 pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <div className="font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                {t.panels.internal}
              </div>
              <ul className="text-neutral-700 dark:text-neutral-300 space-y-0.5">
                {innerHits.map((p, i) => (
                  <li key={i}>
                    {p.panel}{" "}
                    <span className="text-amber-700 dark:text-amber-400">
                      ({p.statuses.map((s) => s.en).join(", ") || t.panels.damaged})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Kosovo import cost estimate constants ---
// All amounts in EUR. The user verifies actuals against current Kosovo customs
// (rates change — particularly excise, which depends on emission standard).
const SHIPPING_KOREA_DURRES_EUR = 1800;
const DURRES_KOSOVO_EUR = 350;
const CUSTOMS_DUTY_RATE = 0.10; // baseline; 0% with SAA EU-origin preference
const VAT_RATE = 0.18;

/**
 * Rough excise-tax estimate by displacement × age × fuel. Kosovo's actual
 * excise schedule keys off emission standard (Euro 4/5/6) which we don't have
 * structured per car, so this approximates by age instead. Diesel attracts a
 * heavier rate than petrol. Intended as a directional figure only.
 */
function estimateExciseEur(
  displacementCc: number | null,
  firstRegDate: string | null,
  fuel: string | null,
): number {
  if (!displacementCc) return 0;
  const year = firstRegDate && firstRegDate.length >= 4 ? parseInt(firstRegDate.slice(0, 4), 10) : null;
  const age = year && Number.isFinite(year) ? new Date().getFullYear() - year : 5;
  let perCc: number;
  if (age >= 15) perCc = 1.5;
  else if (age >= 10) perCc = 1.0;
  else if (age >= 5) perCc = 0.5;
  else perCc = 0.2;
  const f = (fuel ?? "").toLowerCase();
  if (f.includes("디젤") || f.includes("diesel")) perCc *= 1.3;
  return Math.round(displacementCc * perCc);
}

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d.slice(0, 10);
}

const MONTHS_BY_LANG: Record<Lang, string[]> = {
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
  sq: ["Janar", "Shkurt", "Mars", "Prill", "Maj", "Qershor", "Korrik", "Gusht", "Shtator", "Tetor", "Nëntor", "Dhjetor"],
};

function fmtMonthYear(d: string | null | undefined, lang: Lang): string {
  if (!d) return "—";
  const year = d.slice(0, 4);
  const monthStr = d.length === 8 ? d.slice(4, 6) : d.slice(5, 7);
  const m = parseInt(monthStr, 10);
  if (!Number.isFinite(m) || m < 1 || m > 12) return year || "—";
  return `${MONTHS_BY_LANG[lang][m - 1]} ${year}`;
}

function Section({
  title,
  subtitle,
  aside,
  id,
  children,
}: {
  title: string;
  subtitle?: string;
  aside?: React.ReactNode;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id}>
      <div className="flex items-start justify-between gap-4 pb-3 mb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default async function CarDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const carId = Number(id);
  if (!Number.isFinite(carId)) notFound();

  const [car, krwPerEur, dict, lang] = await Promise.all([
    getOrFetchCar(carId),
    getKrwPerEur(),
    getDict(),
    getLang(),
  ]);
  if (!car) notFound();
  const t = dict.car;

  const shortlisted = isInShortlist(carId);
  const STATUS_STALE_MS = 6 * 60 * 60 * 1000;
  const needsStatusCheck = car.listing_state !== "sold" && isStatusStale(car.last_status_check_at, STATUS_STALE_MS);
  const soldBanner =
    car.listing_state === "sold" ? (
      <div className="rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 px-4 py-3">
        <div className="font-semibold text-amber-900 dark:text-amber-200">
          {t.soldBanner.title}
        </div>
        <div className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
          {t.soldBanner.lastVerified} {car.last_status_check_at ? new Date(car.last_status_check_at).toLocaleString(lang) : "—"}.
          {" "}{t.soldBanner.preserved}
        </div>
      </div>
    ) : null;

  const flags: string[] = [];
  const accCount = car.accident_count ?? 0;
  if (accCount >= 3) flags.push(format(t.flags.accidents, { n: accCount }));
  if (car.flood_damage_count && car.flood_damage_count > 0) flags.push(t.flags.floodDamage);
  if (car.theft_count && car.theft_count > 0) flags.push(t.flags.theft);
  if (car.total_loss_count && car.total_loss_count > 0) flags.push(t.flags.totalLoss);
  if (car.has_water_log) flags.push(t.flags.waterLog);
  if (car.business_use) flags.push(t.flags.businessUse);
  if (car.government_use) flags.push(t.flags.governmentUse);
  if (car.uninsured_periods_count && car.uninsured_periods_count > 0) {
    flags.push(format(t.flags.uninsuredPeriods, { n: car.uninsured_periods_count }));
  }
  if (car.has_tuning) flags.push(t.flags.tuned);

  const dealerSaysClean = car.inspector_says_accident === 0;
  const kidiSaysAccidents = accCount > 0;
  if (dealerSaysClean && kidiSaysAccidents) {
    flags.push(format(t.flags.dealerVsKidi, { n: accCount }));
  }

  // Status pills (green/neutral). Different from `flags` which are amber-warning.
  const statusPills: { label: string; tone: "good" | "neutral" | "warn" }[] = [];
  if (car.has_inspection) statusPills.push({ label: t.pills.inspectionPassed, tone: "good" });
  if (car.has_accident_history) statusPills.push({ label: t.pills.kidiPresent, tone: "good" });
  if (car.recall_completed === 1) statusPills.push({ label: t.pills.recallResolved, tone: "good" });
  if (accCount === 0 && car.has_accident_history) {
    statusPills.push({ label: t.pills.noAccidentsKidi, tone: "good" });
  } else if (accCount > 0 && accCount < 3) {
    statusPills.push({
      label: accCount === 1 ? t.pills.accidentOne : format(t.pills.accidentMany, { n: accCount }),
      tone: "warn",
    });
  }
  if (car.listing_state === "active") statusPills.push({ label: t.pills.available, tone: "good" });

  const photos = car.vehicle ? uniquePaths(car.vehicle.photos) : [];
  // Encar's photos[] ordering is dealer-curated and the lead frame is often an
  // interior/option shot. The "_001" image is reliably the front exterior, so
  // promote it to the hero slot when present.
  const heroIdx = photos.findIndex((p) => {
    const file = p.path.split("/").pop() ?? p.path;
    return file.replace(/\.[^.]+$/, "").endsWith("001");
  });
  const orderedPhotos =
    heroIdx > 0
      ? [photos[heroIdx]!, ...photos.slice(0, heroIdx), ...photos.slice(heroIdx + 1)]
      : photos;
  const galleryPhotos: GalleryPhoto[] = orderedPhotos
    .map((p) => {
      const thumb = photoUrlSized(p.path, "thumb");
      const display = photoUrlSized(p.path, "medium");
      const full = photoUrlSized(p.path, "full");
      if (!thumb || !display || !full) return null;
      return { thumb, display, full, alt: p.desc ?? "" };
    })
    .filter((p): p is GalleryPhoto => p !== null);

  // Equipment list — declared on the inspection detail block. Korean titles
  // pass through tt() unscoped (the dictionary doesn't have an `option` bucket,
  // so unmatched values fall back to the original Korean / English).
  const equipment = car.inspection?.master.detail?.mainOptionTypes ?? [];

  const OPTION_CATEGORY_LABEL: Record<string, string> = {
    "Exterior / Interior": t.options.categories.exterior,
    "Safety": t.options.categories.safety,
    "Convenience / Multimedia": t.options.categories.convenience,
    "Seats": t.options.categories.seats,
    "Other": t.options.categories.other,
  };

  // Full option coverage — Encar's per-car payload includes a `vehicle.options`
  // object with `standard: string[]` of option codes the car has. The master
  // dictionary keys (code, category) not code alone — the same code can refer
  // to a Safety option and a Convenience option simultaneously — so we render
  // every dictionary entry whose code matches.
  const vehicleOptions = car.vehicle?.options as
    | { standard?: string[] }
    | undefined;
  const presentOptionCodes = new Set(vehicleOptions?.standard ?? []);

  const optionsByCategory = new Map<string, { code: string; en: string }[]>();
  const matchedCodes = new Set<string>();
  for (const entry of ENCAR_OPTIONS.options) {
    if (!presentOptionCodes.has(entry.code)) continue;
    matchedCodes.add(entry.code);
    const list = optionsByCategory.get(entry.category) ?? [];
    list.push({ code: entry.code, en: entry.en });
    optionsByCategory.set(entry.category, list);
  }
  // Codes the car declares but that aren't in the master dictionary land in
  // "Other" so nothing is silently dropped (rare — only if Encar adds new
  // option codes after our last refresh of encar-options.json).
  for (const code of presentOptionCodes) {
    if (!matchedCodes.has(code)) {
      const list = optionsByCategory.get("Other") ?? [];
      list.push({ code, en: `Option ${code}` });
      optionsByCategory.set("Other", list);
    }
  }
  const orderedOptionCategories = OPTION_CATEGORY_ORDER
    .map((name) => ({ name, items: optionsByCategory.get(name) ?? [] }))
    .filter((c) => c.items.length > 0);

  // car.manufacturer_eng is filled at ingest, but older rows may carry NULL —
  // re-resolve from the catalog (plus the Korean fallback map) before showing
  // the raw Korean key.
  const brandEng = car.manufacturer_eng ?? brandEnglish(car.manufacturer) ?? car.manufacturer ?? "—";
  const modelEng = modelEnglish(car.manufacturer, car.model) || car.model || "";
  const title = `${brandEng} ${modelEng}`.trim();
  // Trim/grade comes from Encar in Korean. We translate it on the fly via the
  // free Google endpoint and cache on the row — first view eats the network
  // round-trip, every subsequent view is free.
  const { translateGrade } = await import("../../../src/translate.js");
  const translatedTrim = await translateGrade(car.car_id).catch(() => null);
  const trim = car.grade_english || translatedTrim || car.grade_name;

  const detailRows: DetailRow[] = [
    { label: t.detailModal.vehicleNo, value: car.vehicle_no ?? "—" },
    { label: t.detailModal.yearOfManufacture, value: fmtMonthYear(car.first_registration_date, lang) },
    {
      label: t.detailModal.mileage,
      value: car.mileage_km != null ? `${car.mileage_km.toLocaleString(lang)} km` : "—",
    },
    {
      label: t.detailModal.displacement,
      value: car.displacement_cc != null ? `${car.displacement_cc.toLocaleString(lang)} cc` : "—",
    },
    { label: t.detailModal.fuel, value: car.fuel ? tt(car.fuel, "fuel", lang) : "—" },
    { label: t.detailModal.transmission, value: car.transmission ? tt(car.transmission, "transmission", lang) : "—" },
    { label: t.detailModal.bodyType, value: car.body_type ?? "—" },
    { label: t.detailModal.color, value: car.color ? tt(car.color, "color", lang) : "—" },
    {
      label: t.detailModal.passenger,
      value: car.seat_count ? format(t.detailModal.seater, { n: car.seat_count }) : "—",
    },
    { label: t.detailModal.vin, value: car.vin ?? "—" },
  ];

  return (
    <div className="mx-auto grid max-w-7xl gap-5 px-4 py-10 sm:px-6">
      {needsStatusCheck && <StatusCheckBeacon carId={carId} />}
      {soldBanner}

      {/* Breadcrumb */}
      <nav className="text-xs text-neutral-500 flex flex-wrap items-center gap-1">
        <Link href="/" className="hover:text-neutral-700 dark:hover:text-neutral-300">{t.breadcrumb.home}</Link>
        <span>/</span>
        <Link href="/search" className="hover:text-neutral-700 dark:hover:text-neutral-300">{t.breadcrumb.catalog}</Link>
        {brandEng !== "—" && (
          <>
            <span>/</span>
            <Link
              href={`/search?brand=${encodeURIComponent(car.manufacturer ?? "")}`}
              className="hover:text-neutral-700 dark:hover:text-neutral-300"
            >
              {brandEng}
            </Link>
          </>
        )}
        {modelEng && (
          <>
            <span>/</span>
            <span className="text-neutral-700 dark:text-neutral-300">{modelEng}</span>
          </>
        )}
      </nav>

      <PhotoGallery photos={galleryPhotos} />

      <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 grid gap-5">

      {/* Title block (price lives in the sidebar) */}
      <section>
        <div className="pb-3 mb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold leading-tight">{title}</h1>
              <form action={refreshCarAction}>
                <input type="hidden" name="carId" value={car.car_id} />
                <button
                  type="submit"
                  title={t.refreshTitle}
                  aria-label={t.refreshAria}
                  className="text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  <Icon name="refresh" size={18} />
                </button>
              </form>
            </div>
            <form action={toggleShortlistAction}>
              <input type="hidden" name="carId" value={car.car_id} />
              <input type="hidden" name="action" value={shortlisted ? "remove" : "add"} />
              <button
                type="submit"
                className={
                  shortlisted
                    ? "text-sm px-3 py-1.5 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/60"
                    : "text-sm px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                }
              >
                {shortlisted ? t.inShortlist : t.addShortlist}
              </button>
            </form>
          </div>
          {trim && (
            <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{trim}</div>
          )}
          <div className="text-xs text-neutral-500 mt-3 flex flex-wrap gap-x-4 gap-y-1 items-center">
            <span>{t.vin}: <code className="font-mono">{car.vin ?? "—"}</code></span>
            <span>{t.plate}: {car.vehicle_no ?? "—"}</span>
            {car.color && <span>{t.color}: {tt(car.color, "color", lang)}</span>}
            <VehicleDetailsModal
              rows={detailRows}
              encarUrl={`http://www.encar.com/dc/dc_cardetailview.do?carid=${car.car_id}`}
            />
          </div>
        </div>

        {/* Spec strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 mt-5">
          <StatCard icon={<Icon name="calendar" />} label={t.spec.firstReg} value={fmtDate(car.first_registration_date)} />
          <StatCard icon={<Icon name="speedometer" />} label={t.spec.mileage} value={car.mileage_km != null ? `${car.mileage_km.toLocaleString(lang)} km` : "—"} />
          <StatCard icon={<Icon name="gear" />} label={t.spec.gearbox} value={car.transmission ? tt(car.transmission, "transmission", lang) : "—"} />
          <StatCard icon={<Icon name="fuel" />} label={t.spec.fuel} value={car.fuel ? tt(car.fuel, "fuel", lang) : "—"} />
          <StatCard icon={<Icon name="engine" />} label={t.spec.engine} value={car.displacement_cc ? `${car.displacement_cc} cc` : "—"} />
          <StatCard icon={<Icon name="bolt" />} label={t.spec.power} value={car.power_hp ? `${car.power_hp} hp · ${car.power_kw} kW` : "—"} />
          <StatCard icon={<Icon name="body" />} label={t.spec.body} value={car.body_type ?? "—"} />
          <StatCard icon={<Icon name="seat" />} label={t.spec.seats} value={car.seat_count ? String(car.seat_count) : "—"} />
          <StatCard icon={<Icon name="body" />} label={t.spec.drivetrain} value={car.drivetrain ?? "—"} />
        </div>
        {car.power_source && (
          <p className="text-[11px] text-neutral-500 mt-2">
            {format(t.powerNote, { source: car.power_source.replace("-", " "), vin: car.vin ?? "—" })}
          </p>
        )}

        {/* Status + flag pills */}
        {(statusPills.length > 0 || flags.length > 0) && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {statusPills.map((p) => (
              <span
                key={p.label}
                className={
                  p.tone === "good"
                    ? "text-xs px-2 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                    : p.tone === "warn"
                      ? "text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300"
                      : "text-xs px-2 py-1 rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
                }
              >
                {p.label}
              </span>
            ))}
            {flags.map((f) => (
              <span
                key={f}
                className="text-xs px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {car.duplicates.length > 0 && (
          <div className="mt-3 text-sm bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 px-3 py-2 rounded-lg">
            {t.duplicates.sameVinAlso}
            {car.duplicates.map((d, i) => (
              <span key={d.car_id}>
                {i > 0 && ", "}
                <Link href={`/car/${d.car_id}`} className="underline">{d.car_id}</Link>
              </span>
            ))}
            {t.duplicates.isRelisting}
          </div>
        )}

      </section>

      {car.accidentHistory && (
        <Section
          title={t.accident.title}
          subtitle={
            car.kidiSourceCarId
              ? format(t.accident.subtitleSourced, { id: car.kidiSourceCarId })
              : t.accident.subtitleDefault
          }
        >
          {car.kidiSourceCarId && (
            <div className="mb-3 text-xs bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 px-3 py-2 rounded-lg">
              {t.accident.sourcedNotePrefix}
              <Link href={`/car/${car.kidiSourceCarId}`} className="underline">
                {format(t.accident.sourcedNoteLinkLabel, { id: car.kidiSourceCarId })}
              </Link>
              {t.accident.sourcedNoteSuffix}
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <Stat label={t.accident.stat.total} value={String(car.accidentHistory.accidentCnt)} />
            <Stat label={t.accident.stat.selfOther} value={`${car.accidentHistory.myAccidentCnt} / ${car.accidentHistory.otherAccidentCnt}`} />
            <Stat label={t.accident.stat.repairCost} value={fmtEur(car.accidentHistory.myAccidentCost, krwPerEur)} />
            <Stat label={t.accident.stat.ownerChanges} value={String(car.accidentHistory.ownerChangeCnt)} />
            <Stat label={t.accident.stat.plateChanges} value={String(car.accidentHistory.carNoChangeCnt)} />
            <Stat label={t.accident.stat.floodTheftLoss} value={`${(car.accidentHistory.floodTotalLossCnt + (car.accidentHistory.floodPartLossCnt ?? 0))} / ${car.accidentHistory.robberCnt} / ${car.accidentHistory.totalLossCnt}`} />
          </div>
          {car.accidentHistory.accidents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead className="text-xs text-neutral-500 uppercase">
                  <tr>
                    <th className="text-left py-1">{t.accident.table.date}</th>
                    <th className="text-left py-1">{t.accident.table.type}</th>
                    <th className="text-right py-1">{t.accident.table.insuranceBenefit}</th>
                    <th className="text-right py-1">{t.accident.table.parts}</th>
                    <th className="text-right py-1">{t.accident.table.labor}</th>
                    <th className="text-right py-1">{t.accident.table.paint}</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {car.accidentHistory.accidents.map((ev, i) => (
                    <tr key={i} className="border-t border-neutral-100 dark:border-neutral-900">
                      <td className="py-1">{ev.date}</td>
                      <td>{tt(ev.type, "accidentType", lang)}</td>
                      <td className="text-right">{fmtEur(ev.insuranceBenefit, krwPerEur)}</td>
                      <td className="text-right">{fmtEur(ev.partCost, krwPerEur)}</td>
                      <td className="text-right">{fmtEur(ev.laborCost, krwPerEur)}</td>
                      <td className="text-right">{fmtEur(ev.paintingCost, krwPerEur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>
      )}

      {car.inspection && (() => {
        const panels = collectChangedPanels(car.inspection, lang);
        if (panels.length === 0) return null;
        return (
          <Section
            title={t.panels.title}
            subtitle={`${t.panels.subtitleBase}${car.accidentHistory ? t.panels.subtitleNotTied : ""}.`}
          >
            <div className="mb-4">
              <CarPanelDiagram panels={panels} t={t} />
            </div>
            <ul className="text-sm grid sm:grid-cols-2 gap-1">
              {panels.map((p, i) => (
                <li key={i} className="flex justify-between gap-2 border-b border-neutral-100 dark:border-neutral-900 py-1">
                  <span className="text-neutral-700 dark:text-neutral-300">
                    {p.panel}
                    {p.panel !== p.panelKo && (
                      <span className="text-neutral-400 ml-1">({p.panelKo})</span>
                    )}
                  </span>
                  <span className="text-amber-700 dark:text-amber-400 font-medium shrink-0">
                    {p.statuses.length > 0
                      ? p.statuses.map((s) => s.en).join(", ")
                      : t.panels.damaged}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        );
      })()}

      {car.inspection && (
        <Section
          title={t.inspection.title}
          subtitle={`${t.inspection.subtitle}${car.inspection.master.supplyNum ? `${t.inspection.reportNumberSep}${car.inspection.master.supplyNum}` : ""}`}
          aside={
            <InspectionReportModal
              inspection={car.inspection}
              encarUrl={`https://www.encar.com/md/sl/mdsl_regcar.do?method=inspectionViewNew&carid=${car.car_id}`}
            />
          }
        >
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <Flag label={t.inspection.flagged.accident} set={car.inspection.master.accdient} yes={t.inspection.yes} no={t.inspection.no} />
            <Flag label={t.inspection.flagged.simpleRepair} set={car.inspection.master.simpleRepair} yes={t.inspection.yes} no={t.inspection.no} />
            <Flag label={t.inspection.flagged.waterLog} set={!!car.inspection.master.detail?.waterlog} yes={t.inspection.yes} no={t.inspection.no} />
            <Flag label={t.inspection.flagged.tuned} set={!!car.inspection.master.detail?.tuning} yes={t.inspection.yes} no={t.inspection.no} />
            <Flag label={t.inspection.flagged.recallOutstanding} set={!!car.inspection.master.detail?.recall && car.recall_completed !== 1} yes={t.inspection.yes} no={t.inspection.no} />
          </div>
          {car.inspection.master.detail?.comments && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">
                {car.inspection_comments_translated ? t.inspection.notesSummaryBoth : t.inspection.notesSummaryKoOnly}
              </summary>
              {car.inspection_comments_translated ? (
                <div className="mt-2 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded text-xs whitespace-pre-wrap">
                  {car.inspection_comments_translated}
                </div>
              ) : (
                <form action={translateInspectionAction} className="mt-2">
                  <input type="hidden" name="carId" value={car.car_id} />
                  <button
                    type="submit"
                    className="text-xs px-2.5 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  >
                    {t.inspection.translateBtn}
                  </button>
                </form>
              )}
              <pre className="whitespace-pre-wrap mt-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded text-xs">
                {car.inspection.master.detail.comments}
              </pre>
            </details>
          )}
        </Section>
      )}

      {equipment.length > 0 && (
        <Section
          title={t.equipment.title}
          subtitle={t.equipment.subtitle}
        >
          <ul className="grid grid-cols-3 gap-x-6 gap-y-2 text-sm">
            {equipment.map((opt, i) => (
              <li key={i} className="flex items-start gap-2 py-0.5 min-w-0">
                <span className="text-emerald-600 dark:text-emerald-400 shrink-0 leading-5">✓</span>
                <span className="text-neutral-700 dark:text-neutral-300 leading-5">{tt(opt.title, undefined, lang)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {orderedOptionCategories.length > 0 && (
        <Section
          title={t.options.title}
          subtitle={t.options.subtitle}
        >
          <div className="grid gap-5">
            {orderedOptionCategories.map((cat) => (
              <div key={cat.name}>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
                  {OPTION_CATEGORY_LABEL[cat.name] ?? cat.name}
                </h3>
                <ul className="grid grid-cols-3 gap-x-6 gap-y-1.5 text-sm">
                  {cat.items.map((item) => (
                    <li
                      key={item.code}
                      className="flex items-start gap-2 py-0.5 min-w-0"
                    >
                      <span
                        className="shrink-0 leading-5 text-emerald-600 dark:text-emerald-400"
                        aria-hidden="true"
                      >
                        ✓
                      </span>
                      <span className="text-neutral-700 dark:text-neutral-300 leading-5 min-w-0">
                        {item.en}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>
      )}

      {car.diagnosis && (
        <Section
          title={t.diagnosis.title}
          subtitle={`#${car.diagnosis.diagnosisNo} · ${car.diagnosis.diagnosisDate.slice(0, 10)} · ${car.diagnosis.reservationCenterName}`}
        >
          <ul className="text-sm grid sm:grid-cols-2 gap-1">
            {car.diagnosis.items.map((it, i) => (
              <li key={i} className="flex justify-between border-b border-neutral-100 dark:border-neutral-900 py-1">
                <span className="text-neutral-600 dark:text-neutral-400">{tt(it.name, "panel", lang)}</span>
                <span className={it.resultCode === "NORMAL" ? "text-emerald-700 dark:text-emerald-400" : it.resultCode ? "text-amber-700 dark:text-amber-400" : ""}>
                  {it.resultCode ? tt(it.resultCode, "diagnosisResult", lang) : it.result.slice(0, 80)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {car.vehicle?.advertisement.oneLineText && (
        <Section title={t.dealerTagline}>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{car.vehicle.advertisement.oneLineText}</p>
        </Section>
      )}

      </div>
      <aside className="lg:col-span-1">
        <div className="lg:sticky lg:top-4">
          <PriceAndCostCard
            priceWon={car.price_won}
            displacementCc={car.displacement_cc}
            firstRegDate={car.first_registration_date}
            fuel={car.fuel}
            krwPerEur={krwPerEur}
            t={t.priceCard}
          />
        </div>
      </aside>
      </div>

    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 p-3">
      <div className="text-xs text-neutral-500 uppercase tracking-wide">{label}</div>
      <div className="text-lg font-mono mt-1">{value}</div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 flex items-center gap-3 bg-neutral-50/50 dark:bg-neutral-900/30">
      <span className="text-neutral-500 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function Flag({ label, set, yes, no }: { label: string; set: boolean; yes: string; no: string }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${set ? "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300" : "bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300"}`}>
      <span>{label}</span>
      <span className="font-mono text-xs">{set ? yes : no}</span>
    </div>
  );
}

function CostRow({ label, value, detail }: { label: string; value: number; detail?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
        <span className="font-mono whitespace-nowrap">€{value.toLocaleString()}</span>
      </div>
      {detail && (
        <div className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{detail}</div>
      )}
    </div>
  );
}

function PriceAndCostCard({
  priceWon,
  displacementCc,
  firstRegDate,
  fuel,
  krwPerEur,
  t,
}: {
  priceWon: number | null;
  displacementCc: number | null;
  firstRegDate: string | null;
  fuel: string | null;
  krwPerEur: number;
  t: CarT["priceCard"];
}) {
  const priceEur = priceWon ? Math.round(priceWon / krwPerEur) : 0;
  const transport = SHIPPING_KOREA_DURRES_EUR + DURRES_KOSOVO_EUR;
  const customs = Math.round((priceEur + transport) * CUSTOMS_DUTY_RATE);
  const vat = Math.round((priceEur + transport + customs) * VAT_RATE);
  const excise = estimateExciseEur(displacementCc, firstRegDate, fuel);
  const total = priceEur + transport + customs + vat + excise;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5">
      <div>
        <div className="text-xs uppercase tracking-wide text-neutral-500">{t.listedPrice}</div>
        <div className="text-3xl font-mono font-semibold mt-1">
          {priceEur > 0 ? `€${priceEur.toLocaleString()}` : "—"}
        </div>
      </div>

      <div className="mt-5 pt-5 border-t border-neutral-100 dark:border-neutral-900">
        <h3 className="text-sm font-semibold">{t.estimatedCostTitle}</h3>
        <p className="text-[11px] text-neutral-500 mt-1 leading-snug">
          {t.estimatedCostSubtitle}
        </p>
      </div>

      <div className="mt-3 space-y-2.5 text-sm">
        <CostRow label={t.listingPrice} value={priceEur} />
        <CostRow
          label={t.transportation}
          value={transport}
          detail={format(t.transportationDetail, {
            kd: SHIPPING_KOREA_DURRES_EUR.toLocaleString(),
            dk: DURRES_KOSOVO_EUR,
          })}
        />
        <CostRow label={format(t.customsDuty, { pct: Math.round(CUSTOMS_DUTY_RATE * 100) })} value={customs} />
        <CostRow label={format(t.vat, { pct: Math.round(VAT_RATE * 100) })} value={vat} />
        <CostRow
          label={t.excise}
          value={excise}
          detail={t.exciseDetail}
        />
      </div>

      <div className="mt-4 pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-baseline justify-between">
        <span className="text-sm font-semibold">{t.totalEstimated}</span>
        <span className="text-xl font-mono font-semibold">€{total.toLocaleString()}</span>
      </div>

      <button
        type="button"
        className="w-full mt-5 px-4 py-2.5 rounded-lg bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        {t.contact}
      </button>
    </div>
  );
}
