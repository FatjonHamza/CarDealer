import Link from "next/link";
import { notFound } from "next/navigation";
import { getCar, isInShortlist } from "../../../src/db/queries.js";
import { tt } from "../../../src/i18n.js";
import { toggleShortlistAction, refreshCarAction } from "../../../src/actions.js";
import { modelEnglish } from "../../../src/catalog-lookup.js";
import { photoUrl, uniquePaths } from "../../../src/photo.js";
import { Icon } from "../../components/Icon.js";

const KRW_PER_EUR = 1400;

interface DetailPageProps {
  params: Promise<{ id: string }>;
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d.slice(0, 10);
}

function fmtKRW(n: number | null | undefined): string {
  if (n == null) return "—";
  return `₩${n.toLocaleString()}`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.round(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export default async function CarDetailPage({ params }: DetailPageProps) {
  const { id } = await params;
  const carId = Number(id);
  if (!Number.isFinite(carId)) notFound();

  const car = getCar(carId);
  if (!car) notFound();

  const shortlisted = isInShortlist(carId);
  const eur = car.price_won ? Math.round(car.price_won / KRW_PER_EUR) : null;

  const flags: string[] = [];
  if ((car.accident_count ?? 0) >= 3) flags.push(`${car.accident_count} accidents`);
  if (car.flood_damage_count && car.flood_damage_count > 0) flags.push("Flood damage");
  if (car.theft_count && car.theft_count > 0) flags.push("Theft history");
  if (car.total_loss_count && car.total_loss_count > 0) flags.push("Total loss declared");
  if (car.has_water_log) flags.push("Inspection: water log");
  if (car.business_use) flags.push("Business use");
  if (car.government_use) flags.push("Government use");
  if (car.uninsured_periods_count && car.uninsured_periods_count > 0) flags.push(`${car.uninsured_periods_count} uninsured period(s)`);
  if (car.has_tuning) flags.push("Tuned");

  // dealer-vs-KIDI inconsistency check
  const dealerSaysClean = car.inspector_says_accident === 0;
  const kidiSaysAccidents = (car.accident_count ?? 0) > 0;
  if (dealerSaysClean && kidiSaysAccidents) {
    flags.push("⚠ Dealer says no accident; KIDI shows " + car.accident_count);
  }

  return (
    <div className="grid gap-6">
      <header>
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">
            {car.manufacturer_eng ?? car.manufacturer} {modelEnglish(car.manufacturer, car.model)}
          </h1>
          <div className="text-right">
            <div className="text-2xl font-mono">{fmtKRW(car.price_won)}</div>
            {eur && <div className="text-sm text-neutral-500">≈ €{eur.toLocaleString()}</div>}
          </div>
        </div>
        <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          {car.grade_english || car.grade_name}
        </div>
        <div className="text-xs text-neutral-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <span>VIN: <code>{car.vin ?? "—"}</code></span>
          <span>Plate: {car.vehicle_no ?? "—"}</span>
          {car.color && <span>Color: {tt(car.color, "color")}</span>}
        </div>

        {/* Stat strip — the at-a-glance specs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          <StatCard
            icon={<Icon name="calendar" />}
            label="First reg"
            value={fmtDate(car.first_registration_date)}
          />
          <StatCard
            icon={<Icon name="speedometer" />}
            label="Mileage"
            value={car.mileage_km != null ? `${car.mileage_km.toLocaleString()} km` : "—"}
          />
          <StatCard
            icon={<Icon name="gear" />}
            label="Gearbox"
            value={car.transmission ? tt(car.transmission, "transmission") : "—"}
          />
          <StatCard
            icon={<Icon name="fuel" />}
            label="Fuel"
            value={car.fuel ? tt(car.fuel, "fuel") : "—"}
          />
          <StatCard
            icon={<Icon name="engine" />}
            label="Engine"
            value={car.displacement_cc ? `${car.displacement_cc} cc` : "—"}
          />
          <StatCard
            icon={<Icon name="bolt" />}
            label="Power"
            value={
              car.power_hp
                ? `${car.power_hp} hp · ${car.power_kw} kW`
                : "—"
            }
          />
          <StatCard
            icon={<Icon name="body" />}
            label="Body"
            value={car.body_type ?? "—"}
          />
          <StatCard
            icon={<Icon name="seat" />}
            label="Seats"
            value={car.seat_count ? String(car.seat_count) : "—"}
          />
          <StatCard
            icon={<Icon name="body" />}
            label="Drivetrain"
            value={car.drivetrain ?? "—"}
          />
        </div>
        {car.power_source && (
          <p className="text-[11px] text-neutral-500 mt-2">
            Power inferred from {car.power_source.replace("-", " ")}; approximate (±10-30 hp by year/variant).
            For an exact figure, cross-reference VIN <code>{car.vin ?? "—"}</code> against the manufacturer&apos;s spec lookup.
          </p>
        )}

        {flags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {flags.map((f) => (
              <span key={f} className="text-sm bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 px-2 py-1 rounded">
                {f}
              </span>
            ))}
          </div>
        )}

        {car.duplicates.length > 0 && (
          <div className="mt-3 text-sm bg-blue-50 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 px-3 py-2 rounded">
            Same VIN — also listed as{" "}
            {car.duplicates.map((d, i) => (
              <span key={d.car_id}>
                {i > 0 && ", "}
                <Link href={`/car/${d.car_id}`} className="underline">{d.car_id}</Link>
              </span>
            ))}
            . This is a re-listing of the same physical car.
          </div>
        )}

        <div className="mt-4 flex items-center gap-3 flex-wrap">
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
              {shortlisted ? "★ In shortlist — remove" : "☆ Add to shortlist"}
            </button>
          </form>
          <form action={refreshCarAction}>
            <input type="hidden" name="carId" value={car.car_id} />
            <button
              type="submit"
              title="Re-fetch this car's data from Encar"
              className="text-sm px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              ↻ Refresh
            </button>
          </form>
          <a
            href={`http://www.encar.com/dc/dc_cardetailview.do?carid=${car.car_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            View on Encar →
          </a>
          <span className="text-xs text-neutral-500 ml-auto">
            Data fetched {timeAgo(car.last_fetched_at)}
          </span>
        </div>
      </header>

      {car.vehicle && car.vehicle.photos.length > 0 && (
        <section>
          {(() => {
            const photos = uniquePaths(car.vehicle.photos);
            return (
              <>
                <h2 className="text-lg font-semibold mb-3">
                  Photos ({photos.length}
                  {photos.length !== car.vehicle.photos.length && (
                    <span className="text-neutral-500 text-sm font-normal">
                      {" "}/ {car.vehicle.photos.length} total
                    </span>
                  )}
                  )
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {photos.slice(0, 12).map((p, i) => {
                    const url = photoUrl(p.path);
                    if (!url) return null;
                    return (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={`${i}-${p.path}`}
                        src={url}
                        alt={p.desc ?? ""}
                        className="rounded border border-neutral-200 dark:border-neutral-800 w-full h-32 object-cover"
                      />
                    );
                  })}
                </div>
              </>
            );
          })()}
        </section>
      )}

      {car.accidentHistory && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Accident history (KIDI)</h2>
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            <Stat label="Total accidents" value={String(car.accidentHistory.accidentCnt)} />
            <Stat label="Self / other" value={`${car.accidentHistory.myAccidentCnt} / ${car.accidentHistory.otherAccidentCnt}`} />
            <Stat label="Total repair cost" value={fmtKRW(car.accidentHistory.myAccidentCost)} />
            <Stat label="Owner changes" value={String(car.accidentHistory.ownerChangeCnt)} />
            <Stat label="Plate changes" value={String(car.accidentHistory.carNoChangeCnt)} />
            <Stat label="Flood / theft / loss" value={`${(car.accidentHistory.floodTotalLossCnt + (car.accidentHistory.floodPartLossCnt ?? 0))} / ${car.accidentHistory.robberCnt} / ${car.accidentHistory.totalLossCnt}`} />
          </div>
          {car.accidentHistory.accidents.length > 0 && (
            <div className="overflow-x-auto">
              <table className="text-sm w-full">
                <thead className="text-xs text-neutral-500 uppercase">
                  <tr>
                    <th className="text-left py-1">Date</th>
                    <th className="text-left py-1">Type</th>
                    <th className="text-right py-1">Insurance benefit</th>
                    <th className="text-right py-1">Parts</th>
                    <th className="text-right py-1">Labor</th>
                    <th className="text-right py-1">Paint</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {car.accidentHistory.accidents.map((ev, i) => (
                    <tr key={i} className="border-t border-neutral-100 dark:border-neutral-900">
                      <td className="py-1">{ev.date}</td>
                      <td>{tt(ev.type, "accidentType")}</td>
                      <td className="text-right">{fmtKRW(ev.insuranceBenefit)}</td>
                      <td className="text-right">{fmtKRW(ev.partCost)}</td>
                      <td className="text-right">{fmtKRW(ev.laborCost)}</td>
                      <td className="text-right">{fmtKRW(ev.paintingCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {car.inspection && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Inspection</h2>
          <div className="text-xs text-neutral-500 mb-2">#{car.inspection.master.supplyNum}</div>
          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <Flag label="Inspector flagged accident" set={car.inspection.master.accdient} />
            <Flag label="Simple repair flagged" set={car.inspection.master.simpleRepair} />
            <Flag label="Water log" set={!!car.inspection.master.detail?.waterlog} />
            <Flag label="Tuned" set={!!car.inspection.master.detail?.tuning} />
            <Flag label="Recall outstanding" set={!!car.inspection.master.detail?.recall && car.recall_completed !== 1} />
          </div>
          {car.inspection.master.detail?.comments && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-neutral-600 dark:text-neutral-400">Inspector notes (Korean)</summary>
              <pre className="whitespace-pre-wrap mt-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded text-xs">
                {car.inspection.master.detail.comments}
              </pre>
            </details>
          )}
        </section>
      )}

      {car.diagnosis && (
        <section>
          <h2 className="text-lg font-semibold mb-2">Encar diagnosis</h2>
          <div className="text-xs text-neutral-500 mb-2">
            #{car.diagnosis.diagnosisNo} · {car.diagnosis.diagnosisDate.slice(0, 10)} · {car.diagnosis.reservationCenterName}
          </div>
          <ul className="text-sm grid sm:grid-cols-2 gap-1">
            {car.diagnosis.items.map((it, i) => (
              <li key={i} className="flex justify-between border-b border-neutral-100 dark:border-neutral-900 py-1">
                <span className="text-neutral-600 dark:text-neutral-400">{tt(it.name, "panel")}</span>
                <span className={it.resultCode === "NORMAL" ? "text-emerald-700 dark:text-emerald-400" : it.resultCode ? "text-amber-700 dark:text-amber-400" : ""}>
                  {it.resultCode ? tt(it.resultCode, "diagnosisResult") : it.result.slice(0, 80)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {car.vehicle?.advertisement.oneLineText && (
        <section>
          <h2 className="text-lg font-semibold mb-1">Dealer tagline</h2>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">{car.vehicle.advertisement.oneLineText}</p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-neutral-200 dark:border-neutral-800 p-3">
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
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2.5 flex items-center gap-3">
      <span className="text-neutral-500 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
        <div className="text-sm font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function Flag({ label, set }: { label: string; set: boolean }) {
  return (
    <div className={`flex items-center justify-between px-3 py-2 rounded ${set ? "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300" : "bg-neutral-100 dark:bg-neutral-900"}`}>
      <span>{label}</span>
      <span className="font-mono text-xs">{set ? "YES" : "no"}</span>
    </div>
  );
}
