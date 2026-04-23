import type { QueryCtx } from "../_generated/server.js";
import type { Interval } from "../lib/interval.js";
import type { Logger } from "../lib/logging.js";
import { serialize, type Primitive } from "../validators/primitive.js";
import { encodeBound, type Cursor } from "../lib/cursor.js";
import { DatabaseRange } from "./databaseRange.js";
import type { Stats } from "./zigzag.js";
import type { CounterKey } from "../schema.js";

export class FilterKeyRange extends DatabaseRange {
  constructor(
    ctx: QueryCtx,
    logger: Logger,
    private filterKey: string,
    private filterValue: Primitive,
    cursor: Cursor | undefined,
    interval: Interval,
    prefetchSize: number,
    stats: Stats,
  ) {
    super(ctx, logger, cursor, interval, prefetchSize, stats);
  }

  async initialQuery(): Promise<Cursor[]> {
    const docs = await this.ctx.db
      .query("pointFilters")
      .withIndex("by_filter_and_cursor", (q) => {
        const withFilter = q
          .eq("filterKey", this.filterKey)
          .eq("filterValue", this.filterValue);
        let withStart;
        if (this.cursor !== undefined) {
          withStart = withFilter.gt("cursor", this.cursor);
        } else if (this.interval.startInclusive !== undefined) {
          const bound = encodeBound(this.interval.startInclusive);
          withStart = withFilter.gte("cursor", bound);
        } else {
          withStart = withFilter;
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
      `Initial query for filter key ${this.filterKey} returned ${docs.length} results`,
    );
    return docs.map((doc) => doc.cursor);
  }

  async advanceQuery(lastKey: Cursor): Promise<Cursor[]> {
    const docs = await this.ctx.db
      .query("pointFilters")
      .withIndex("by_filter_and_cursor", (q) => {
        const withStart = q
          .eq("filterKey", this.filterKey)
          .eq("filterValue", this.filterValue)
          .gt("cursor", lastKey);
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
      `Advance query for filter key ${this.filterKey} returned ${docs.length} results`,
    );
    return docs.map((doc) => doc.cursor);
  }

  async seekQuery(tuple: Cursor): Promise<Cursor[]> {
    const docs = await this.ctx.db
      .query("pointFilters")
      .withIndex("by_filter_and_cursor", (q) => {
        const withStart = q
          .eq("filterKey", this.filterKey)
          .eq("filterValue", this.filterValue)
          .gte("cursor", tuple);
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
      `Seek query for filter key ${this.filterKey} returned ${docs.length} results`,
    );
    return docs.map((doc) => doc.cursor);
  }

  getCounterKey(): CounterKey {
    return filterCounterKey(this.filterKey, this.filterValue);
  }
}

export function filterCounterKey(
  filterKey: string,
  filterValue: Primitive,
): CounterKey {
  return ("filter:" + filterKey + ":" + serialize(filterValue)) as CounterKey;
}
