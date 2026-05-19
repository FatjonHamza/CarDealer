/**
 * Infer engine power for a car from its trim badge or engine code.
 *
 * Strategy: NHTSA's free VIN decoder only works for US-market VINs (most of our
 * dataset is European-built German cars sold in Korea — W-prefix VINs that NHTSA
 * doesn't know). So instead we use trim badges, which Encar exposes directly in
 * the listing data and which encode power deterministically for our brands:
 *
 *   - BMW: "xDrive 30d M Sport" → "30d" → 286 hp (3.0L diesel)
 *   - Audi: "45 TDI 콰트로" → "45 TDI" → 231 hp
 *   - VW: "V6 3.0 TDI 블루모션" → "3.0 TDI" → 245 hp
 *
 * As a fallback we also map known engine codes (motor_type from the inspection
 * record, e.g. "B57D30A" → 265 hp).
 *
 * Rules live in src/data/power-rules.json. Power is approximate (±10-30 hp by
 * year/variant); useful for shopping comparisons, not for spec-sheet quoting.
 */

import rules from "./data/power-rules.json" with { type: "json" };

const HP_PER_KW = 1.34102;

export interface PowerEstimate {
  hp: number;
  kw: number;
  /** How we derived it — useful for transparency / debugging. */
  source: "bmw-grade" | "audi-grade" | "vw-grade" | "engine-code";
  /** Matched token, e.g. "30d", "45 TDI", "B57D30A". */
  matchedOn: string;
}

function pickLongest(table: Record<string, number>, hay: string): { token: string; hp: number } | null {
  // Match by substring, prefer the longest key (so "M40i" beats "40i")
  const hayUpper = hay.toUpperCase();
  let best: { token: string; hp: number } | null = null;
  for (const [token, hp] of Object.entries(table)) {
    if (hayUpper.includes(token.toUpperCase())) {
      if (!best || token.length > best.token.length) best = { token, hp };
    }
  }
  return best;
}

export function inferPower(
  manufacturerEng: string | null | undefined,
  gradeName: string | null | undefined,
  motorType: string | null | undefined,
): PowerEstimate | null {
  // 1) Brand-specific grade-name match
  if (gradeName) {
    if (manufacturerEng === "BMW") {
      const hit = pickLongest(rules.bmwGrade, gradeName);
      if (hit) return { hp: hit.hp, kw: Math.round(hit.hp / HP_PER_KW), source: "bmw-grade", matchedOn: hit.token };
    }
    if (manufacturerEng === "Audi") {
      const hit = pickLongest(rules.audiGrade, gradeName);
      if (hit) return { hp: hit.hp, kw: Math.round(hit.hp / HP_PER_KW), source: "audi-grade", matchedOn: hit.token };
    }
    if (manufacturerEng === "Volkswagen") {
      const hit = pickLongest(rules.vwGrade, gradeName);
      if (hit) return { hp: hit.hp, kw: Math.round(hit.hp / HP_PER_KW), source: "vw-grade", matchedOn: hit.token };
    }
  }

  // 2) Engine code (motor_type from inspection record) — brand-agnostic
  if (motorType) {
    const codes = rules.engineCode as Record<string, number>;
    // Exact match first
    const direct = codes[motorType.toUpperCase()];
    if (direct) {
      return { hp: direct, kw: Math.round(direct / HP_PER_KW), source: "engine-code", matchedOn: motorType };
    }
  }

  return null;
}
