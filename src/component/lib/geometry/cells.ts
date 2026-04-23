import type { S2Bindings } from "../s2Bindings.js";
import type { Config, Point } from "../../validators.js";
import type { CellIDToken } from "../../schema.js";

export function s2CellTokens(
  s2: S2Bindings,
  points: Point[],
  opts: Config,
): CellIDToken[] {
  const cellIds = s2.coverPolygonForIndex(points, opts.maxCells);
  const filtered = s2.filterCellsByLevel(
    cellIds,
    opts.minLevel,
    opts.maxLevel,
    opts.levelMod,
  );
  return filtered.map((cellId) => s2.cellIDToken(cellId));
}
