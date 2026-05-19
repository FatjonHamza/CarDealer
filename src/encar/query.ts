/**
 * Encar's search uses a dotted Lucene-like expression syntax:
 *
 *   (And.Hidden.N._.(C.CarType.N._.(C.Manufacturer.BMW._.ModelGroup.X5.)))
 *
 * Grammar:
 *   expr    := eq | group
 *   eq      := Field.Value.
 *   group   := (<OP>. expr _. expr _. ...)
 *   OP      := And | Or | C
 *
 * `C` behaves like And for our purposes — it's a single-field "constraint" group.
 *
 * Build these from typed primitives instead of hand-assembling strings.
 */

export type Expr =
  | { kind: "eq"; field: string; value: string }
  | { kind: "and"; ops: Expr[] }
  | { kind: "or"; ops: Expr[] }
  | { kind: "c"; ops: Expr[] };

export const eq = (field: string, value: string): Expr => ({ kind: "eq", field, value });
export const and = (...ops: Expr[]): Expr => ({ kind: "and", ops });
export const or = (...ops: Expr[]): Expr => ({ kind: "or", ops });
export const c = (...ops: Expr[]): Expr => ({ kind: "c", ops });

export function render(e: Expr): string {
  switch (e.kind) {
    case "eq":
      return `${e.field}.${e.value}.`;
    case "and":
      return `(And.${e.ops.map(render).join("_.")})`;
    case "or":
      return `(Or.${e.ops.map(render).join("_.")})`;
    case "c":
      return `(C.${e.ops.map(render).join("_.")})`;
  }
}

/** Common building blocks for our German-SUV-on-Encar use case. */
export const visible = eq("Hidden", "N");
export const imported = eq("CarType", "N");
export const domestic = eq("CarType", "Y");

export const manufacturer = (m: string) => eq("Manufacturer", m);
export const modelGroup = (g: string) => eq("ModelGroup", g);
export const model = (m: string) => eq("Model", m);

/** Year range — Encar uses .. as a range operator (TODO: verify). For now use Range. */
export const yearRange = (from: number, to: number) =>
  eq("Year", `range(${from}..${to})`);

/** A standard "visible + imported + brand+model" query. */
export function importedModelQuery(brand: string, modelGroupName: string): Expr {
  return and(visible, c(imported, c(manufacturer(brand), modelGroup(modelGroupName))));
}
