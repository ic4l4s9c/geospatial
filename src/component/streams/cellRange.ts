import type { QueryCtx } from "../_generated/server.js";
import type { Interval } from "../lib/interval.js";
import type { Logger } from "../lib/logging.js";
import { encodeBound, type Cursor } from "../lib/cursor.js";
import { DatabaseRange } from "./databaseRange.js";
import type { Stats } from "./zigzag.js";
import type { CellIDToken, CounterKey } from "../schema.js";

export class CellRange extends DatabaseRange {
  constructor(
    ctx: QueryCtx,
    logger: Logger,
    private cell: CellIDToken,
    cursor: Cursor | undefined,
    interval: Interval,
    prefetchSize: number,
    stats: Stats,
  ) {
    super(ctx, logger, cursor, interval, prefetchSize, stats);
  }

  async initialQuery(): Promise<Cursor[]> {
    const docs = await this.ctx.db
      .query("pointCells")
      .withIndex("by_cell_and_cursor", (q) => {
        const withCell = q.eq("cell", this.cell);
        let withStart;
        if (this.cursor !== undefined) {
          withStart = withCell.gt("cursor", this.cursor);
        } else if (this.interval.startInclusive !== undefined) {
          const bound = encodeBound(this.interval.startInclusive);
          withStart = withCell.gte("cursor", bound);
        } else {
          withStart = withCell;
        }
        let withEnd;
        if (this.interval.endExclusive !== undefined) {
          const bound = encodeBound(this.interval.endExclusive);
          withEnd = withStart.lt("cursor", bound);
        } else {
          withEnd = withStart;
        }
        return withEnd;
      })
      .take(this.prefetchSize);
    this.logger.debug(
      `Initial query for cell ${this.cell} returned ${docs.length} results`,
      docs,
    );
    return docs.map((doc) => doc.cursor);
  }

  async advanceQuery(lastKey: Cursor): Promise<Cursor[]> {
    const docs = await this.ctx.db
      .query("pointCells")
      .withIndex("by_cell_and_cursor", (q) => {
        const withStart = q.eq("cell", this.cell).gt("cursor", lastKey);
        let withEnd;
        if (this.interval.endExclusive !== undefined) {
          const bound = encodeBound(this.interval.endExclusive);
          withEnd = withStart.lt("cursor", bound);
        } else {
          withEnd = withStart;
        }
        return withEnd;
      })
      .take(this.prefetchSize);
    this.logger.debug(
      `Advance query for cell ${this.cell} returned ${docs.length} results`,
      docs,
    );
    return docs.map((doc) => doc.cursor);
  }

  async seekQuery(tuple: Cursor): Promise<Cursor[]> {
    const docs = await this.ctx.db
      .query("pointCells")
      .withIndex("by_cell_and_cursor", (q) => {
        const withStart = q.eq("cell", this.cell).gte("cursor", tuple);
        let withEnd;
        if (this.interval.endExclusive !== undefined) {
          const bound = encodeBound(this.interval.endExclusive);
          withEnd = withStart.lt("cursor", bound);
        } else {
          withEnd = withStart;
        }
        return withEnd;
      })
      .take(this.prefetchSize);
    this.logger.debug(
      `Seek query for cell ${this.cell} returned ${docs.length} results`,
      docs,
    );
    return docs.map((doc) => doc.cursor);
  }

  getCounterKey(): CounterKey {
    return cellCounterKey(this.cell);
  }
}

export function cellCounterKey(cell: CellIDToken): CounterKey {
  return ("cell:" + cell) as CounterKey;
}
