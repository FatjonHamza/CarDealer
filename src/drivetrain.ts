/**
 * Infer 2WD vs 4WD from the grade name + model name. All cars in our scope
 * (BMW/Audi/VW SUVs sold in Korea) have a deterministic answer:
 *
 *   - BMW xDrive / Audi 콰트로 (quattro) / VW 4모션 (4Motion) → 4WD
 *   - BMW sDrive                                            → 2WD
 *   - VW Touareg (any variant)                              → 4WD (always AWD in Korea)
 *   - VW Tiguan without 4Motion                             → 2WD (FWD)
 */

export type Drivetrain = "2WD" | "4WD";

const AWD_PATTERN = /xDrive|콰트로|quattro|4모션|4Motion/i;
const RWD_PATTERN = /sDrive/i;

export function inferDrivetrain(
  manufacturerEng: string | null | undefined,
  gradeName: string | null | undefined,
  modelName: string | null | undefined,
): Drivetrain | null {
  if (gradeName) {
    if (AWD_PATTERN.test(gradeName)) return "4WD";
    if (RWD_PATTERN.test(gradeName)) return "2WD";
  }

  // VW-specific fallbacks — model determines drivetrain when grade is silent
  if (manufacturerEng === "Volkswagen" && modelName) {
    if (/투아렉|Touareg/i.test(modelName)) return "4WD";
    if (/티구안|Tiguan/i.test(modelName)) return "2WD";
  }

  return null;
}
