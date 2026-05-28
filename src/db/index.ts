/**
 * SQLite connection + schema migration.
 *
 * Single-user, file-based. Open once at startup. Schema lives in this file as
 * IF-NOT-EXISTS DDL — no versioned migrations until we need them.
 */

import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env.DB_PATH ?? "data/cardealer.db";

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  mkdirSync(dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma("journal_mode = WAL");
  _db.pragma("foreign_keys = ON");
  migrate(_db);
  return _db;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS cars (
  car_id                    INTEGER PRIMARY KEY,
  vehicle_no                TEXT,
  vin                       TEXT,

  -- category (brand/model)
  manufacturer              TEXT,         -- Korean key as stored on Encar ('BMW', '아우디')
  manufacturer_eng          TEXT,         -- from catalog ('BMW', 'Audi')
  model                     TEXT,         -- 'X5 (G05)'
  grade_name                TEXT,         -- 'xDrive 30d xLine'
  grade_english             TEXT,

  -- spec
  mileage_km                INTEGER,
  displacement_cc           INTEGER,
  fuel                      TEXT,
  transmission              TEXT,
  color                     TEXT,
  body_type                 TEXT,
  seat_count                INTEGER,
  featured_photo_path       TEXT,

  -- advertisement
  price_won                 INTEGER,      -- in KRW (Price * 10000)
  status                    TEXT,         -- 'ADVERTISE' etc
  one_line_text             TEXT,

  -- inspection master.detail
  first_registration_date   TEXT,         -- 'YYYYMMDD'
  motor_type                TEXT,
  has_water_log             INTEGER,
  has_tuning                INTEGER,
  recall_completed          INTEGER,
  inspector_says_accident   INTEGER,
  inspection_comments       TEXT,
  inspection_supply_num     TEXT,

  -- accident history (denormalized for filter/sort)
  accident_count            INTEGER,
  self_accident_count       INTEGER,
  other_accident_count      INTEGER,
  total_repair_cost_won     INTEGER,
  owner_change_count        INTEGER,
  plate_change_count        INTEGER,
  flood_damage_count        INTEGER,
  theft_count               INTEGER,
  total_loss_count          INTEGER,
  uninsured_periods_count   INTEGER,
  business_use              INTEGER,
  government_use            INTEGER,
  loan_flag                 INTEGER,

  -- data completeness
  has_vehicle               INTEGER NOT NULL DEFAULT 0,
  has_inspection            INTEGER NOT NULL DEFAULT 0,
  has_accident_history      INTEGER NOT NULL DEFAULT 0,
  has_diagnosis             INTEGER NOT NULL DEFAULT 0,

  -- raw blobs (for full re-display without refetching)
  vehicle_json              TEXT,
  inspection_json           TEXT,
  accident_history_json     TEXT,
  diagnosis_json            TEXT,

  -- metadata
  first_ad_date             TEXT,
  modify_date               TEXT,
  first_seen_at             TEXT NOT NULL,
  last_fetched_at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cars_make_model      ON cars(manufacturer, model);
CREATE INDEX IF NOT EXISTS idx_cars_price           ON cars(price_won);
CREATE INDEX IF NOT EXISTS idx_cars_mileage         ON cars(mileage_km);
CREATE INDEX IF NOT EXISTS idx_cars_first_reg       ON cars(first_registration_date);
CREATE INDEX IF NOT EXISTS idx_cars_vin             ON cars(vin);
CREATE INDEX IF NOT EXISTS idx_cars_status          ON cars(status);
CREATE INDEX IF NOT EXISTS idx_cars_accident_count  ON cars(accident_count);

CREATE TABLE IF NOT EXISTS shortlist (
  car_id    INTEGER PRIMARY KEY REFERENCES cars(car_id) ON DELETE CASCADE,
  note      TEXT,
  added_at  TEXT NOT NULL
);
`;

function migrate(d: Database.Database): void {
  d.exec(SCHEMA);
  // Idempotent column additions for tables already created in older schema.
  for (const ddl of [
    "ALTER TABLE cars ADD COLUMN body_type TEXT",
    "ALTER TABLE cars ADD COLUMN seat_count INTEGER",
    "ALTER TABLE cars ADD COLUMN featured_photo_path TEXT",
    "ALTER TABLE cars ADD COLUMN model_eng TEXT",
    "CREATE INDEX IF NOT EXISTS idx_cars_model_eng ON cars(model_eng)",
    "ALTER TABLE cars ADD COLUMN power_hp INTEGER",
    "ALTER TABLE cars ADD COLUMN power_kw INTEGER",
    "ALTER TABLE cars ADD COLUMN power_source TEXT",
    "ALTER TABLE cars ADD COLUMN drivetrain TEXT",
    "CREATE INDEX IF NOT EXISTS idx_cars_drivetrain ON cars(drivetrain)",
    // Listing lifecycle: 'active' | 'sold' | 'unknown'. Separate from the Encar
    // `status` ad column above. Default 'active' so existing rows don't show
    // a misleading 'no longer listed' banner until they've actually been checked.
    "ALTER TABLE cars ADD COLUMN listing_state TEXT NOT NULL DEFAULT 'active'",
    "ALTER TABLE cars ADD COLUMN last_status_check_at TEXT",
    "CREATE INDEX IF NOT EXISTS idx_cars_listing_state ON cars(listing_state)",
  ]) {
    try { d.exec(ddl); } catch (e) {
      // SQLite throws if column exists; that's fine.
      const msg = (e as Error).message;
      if (!/duplicate column name/i.test(msg)) throw e;
    }
  }
}

export function close(): void {
  _db?.close();
  _db = null;
}
