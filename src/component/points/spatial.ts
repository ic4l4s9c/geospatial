import { v } from "convex/values";
import {
  config,
  filterCondition,
  type Point,
  point,
  rectangle,
} from "../validators.js";
import { query } from "../_generated/server.js";
import type { PointSet, Stats } from "../streams/zigzag.js";
import { Intersection } from "../streams/intersection.js";
import { Union } from "../streams/union.js";
import { FilterKeyRange } from "../streams/filterKeyRange.js";
import { CellRange } from "../streams/cellRange.js";
import { interval } from "../lib/interval.js";
import { decodeCursor, type Cursor } from "../lib/cursor.js";
import { Channel, ChannelClosedError } from "async-channel";
import type { Doc, Id } from "../_generated/dataModel.js";
import { createLogger, logLevel } from "../lib/logging.js";
import { S2Bindings } from "../lib/s2Bindings.js";
import { ClosestPointQuery } from "../lib/closestPointQuery.js";
import { PREFETCH_SIZE } from "../streams/constants.js";
import { paginationResultValidator } from "convex/server";
import type { CellIDToken } from "../schema.js";

export { PREFETCH_SIZE } from "../streams/constants.js";

const geospatialQuery = v.object({
  rectangle,
  filtering: v.optional(v.array(filterCondition)),
  sorting: v.object({
    // TODO: Support reverse order.
    // order: v.union(v.literal("asc"), v.literal("desc")),
    interval,
  }),
  limit: v.number(),
});

const pointDoc = v.object({
  key: v.string(),
  coordinates: point,
});

const pointDocWithDistance = pointDoc.extend({
  distance: v.number(),
});

export const within = query({
  args: {
    query: geospatialQuery,
    cursor: v.optional(v.string()),
    config: config,
    logLevel: v.optional(logLevel),
  },
  returns: paginationResultValidator(pointDoc),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);

    const s2 = await S2Bindings.load();

    logger.time("execute");
    // First, validate the query.
    const { sorting, rectangle } = args.query;
    if (
      sorting.interval.startInclusive !== undefined &&
      sorting.interval.endExclusive !== undefined
    ) {
      if (sorting.interval.startInclusive > sorting.interval.endExclusive) {
        throw new Error("Invalid interval: start is greater than end");
      }
      if (sorting.interval.startInclusive === sorting.interval.endExclusive) {
        logger.debug("Interval is empty, returning no results");
        return { page: [], isDone: true, continueCursor: "" };
      }
    }
    const cells = s2
      .coverRectangle(
        rectangle,
        args.config.minLevel,
        args.config.maxLevel,
        args.config.levelMod,
        args.config.maxCells,
      )
      .map((cellID) => s2.cellIDToken(cellID));
    logger.debug("S2 cells", args, cells);

    const stats: Stats = {
      cells: cells.length,
      queriesIssued: 0,
      rowsRead: 0,
      rowsPostFiltered: 0,
    };
    const cellRanges = cells.map(
      (cell) =>
        new CellRange(
          ctx,
          logger,
          cell,
          args.cursor,
          sorting.interval,
          PREFETCH_SIZE,
          stats,
        ),
    );
    const cellStream = new Union(cellRanges);

    // Third, build up the streams for filter keys.
    const mustRanges: FilterKeyRange[] = [];
    const shouldRanges: FilterKeyRange[] = [];
    for (const filter of args.query.filtering ?? []) {
      const ranges = filter.occur === "must" ? mustRanges : shouldRanges;
      ranges.push(
        new FilterKeyRange(
          ctx,
          logger,
          filter.filterKey,
          filter.filterValue,
          args.cursor,
          sorting.interval,
          PREFETCH_SIZE,
          stats,
        ),
      );
    }

    // Fourth, build up the final query stream.
    const intersectionStreams: PointSet[] = [cellStream];
    if (shouldRanges.length > 0) {
      intersectionStreams.push(new Union(shouldRanges));
    }
    if (mustRanges.length > 0) {
      intersectionStreams.push(...mustRanges);
    }
    let stream: PointSet;
    if (intersectionStreams.length > 1) {
      stream = new Intersection(intersectionStreams);
    } else {
      stream = intersectionStreams[0];
    }

    // Finally, consume the stream and fetch the resulting IDs.
    const channel = new Channel<{
      cursor: Cursor<number, Id<"points">>;
      promise: Promise<Doc<"points"> | null>;
    }>(8);
    const producer = async () => {
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const cursor = await stream.current();
          if (cursor === null) {
            break;
          }
          const { id } = decodeCursor<number, Id<"points">>(cursor);
          try {
            await channel.push({
              cursor: cursor,
              promise: ctx.db.get(id),
            });
          } catch (e) {
            if (e instanceof ChannelClosedError) {
              break;
            }
            throw e;
          }
          await stream.advance();
        }
      } finally {
        if (!channel.closed) {
          // Don't clear the channel since we want the consumer to
          // still be able to process buffered elements we emitted.
          channel.close(false);
        }
      }
      logger.debug("Producer shutting down");
    };
    const page: { key: string; coordinates: Point }[] = [];
    let continueCursor: Cursor = "";
    const consumer = async () => {
      try {
        for await (const { cursor, promise } of channel) {
          const doc = await promise;
          if (doc === null) {
            throw new Error("Internal error: document not found");
          }

          const contains = s2.rectangleContains(rectangle, doc.coordinates);
          if (!contains) {
            stats.rowsPostFiltered++;
            continue;
          }
          page.push({
            key: doc.key,
            coordinates: doc.coordinates,
          });
          if (page.length >= args.query.limit) {
            logger.debug(
              `Consumer reached max results of ${args.query.limit} at ${cursor}`,
            );
            continueCursor = cursor;
            return;
          }
          if (stats.rowsRead >= 1024) {
            logger.warn(
              `Consumer reached Convex query limit of 1024 rows at ${cursor}`,
            );
            continueCursor = cursor;
            return;
          }
        }
        logger.debug(`Consumer reached end of stream`);
        continueCursor = "";
        return;
      } finally {
        if (!channel.closed) {
          // Discard all buffered items when the consumer closes the channel,
          // which will wake up the producer.
          channel.close(true);
        }
      }
    };
    await Promise.all([producer(), consumer()]);
    logger.info(`Found ${page.length} results (${JSON.stringify(stats)})`);
    logger.timeEnd("execute");

    return {
      page,
      continueCursor,
      isDone: continueCursor === "",
    };
  },
});

export const nearest = query({
  args: {
    config: config,
    query: v.object({
      point: point,
      maxDistance: v.optional(v.number()),
      limit: v.number(),
      filtering: v.optional(v.array(filterCondition)),
      sorting: v.object({ interval: interval }),
    }),
    cursor: v.optional(v.string()),
    logLevel: v.optional(logLevel),
  },
  returns: paginationResultValidator(pointDocWithDistance),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);
    const s2 = await S2Bindings.load();
    if (args.query.limit === 0) {
      return { page: [], isDone: true, continueCursor: "" };
    }
    const query = new ClosestPointQuery(
      s2,
      logger,
      args.query.point,
      args.query.maxDistance,
      args.query.limit,
      args.config.minLevel,
      args.config.maxLevel,
      args.config.levelMod,
      args.query.filtering,
      args.query.sorting.interval,
      args.cursor,
    );
    return await query.execute(ctx);
  },
});
