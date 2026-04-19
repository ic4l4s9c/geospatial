import { v } from "convex/values";
import { type Point, point, primitive, rectangle } from "./validators.js";
import { query } from "./_generated/server.js";
import type { PointSet, Stats } from "./streams/zigzag.js";
import { Intersection } from "./streams/intersection.js";
import { Union } from "./streams/union.js";
import { FilterKeyRange } from "./streams/filterKeyRange.js";
import { CellRange } from "./streams/cellRange.js";
import { interval } from "./lib/interval.js";
import { decodeTupleKey, type TupleKey } from "./lib/tupleKey.js";
import { Channel, ChannelClosedError } from "async-channel";
import type { Doc } from "./_generated/dataModel.js";
import { createLogger, logLevel } from "./lib/logging.js";
import { S2Bindings } from "./lib/s2Bindings.js";
import { ClosestPointQuery } from "./lib/closestPointQuery.js";
import { PREFETCH_SIZE } from "./streams/constants.js";
import { paginationResultValidator } from "convex/server";

export { PREFETCH_SIZE } from "./streams/constants.js";

const equalityCondition = v.object({
  occur: v.union(v.literal("should"), v.literal("must")),
  filterKey: v.string(),
  filterValue: primitive,
});

const geospatialQuery = v.object({
  rectangle,
  filtering: v.array(equalityCondition),
  sorting: v.object({
    // TODO: Support reverse order.
    // order: v.union(v.literal("asc"), v.literal("desc")),
    interval,
  }),
  maxResults: v.number(),
});

const queryResult = v.object({
  key: v.string(),
  coordinates: point,
});

const queryResultWithDistance = v.object({
  key: v.string(),
  coordinates: point,
  distance: v.number(),
});

const executePaginationResult = paginationResultValidator(queryResult);

export const execute = query({
  args: {
    query: geospatialQuery,
    cursor: v.optional(v.string()),
    minLevel: v.number(),
    maxLevel: v.number(),
    levelMod: v.number(),
    maxCells: v.number(),
    logLevel: v.optional(logLevel),
  },
  returns: executePaginationResult,
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);

    const s2 = await S2Bindings.load();

    logger.time("execute");
    // First, validate the query.
    const { sorting } = args.query;
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
    const { rectangle } = args.query;
    const cells = s2
      .coverRectangle(
        rectangle,
        args.minLevel,
        args.maxLevel,
        args.levelMod,
        args.maxCells,
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
    for (const filter of args.query.filtering) {
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
      tupleKey: TupleKey;
      docPromise: Promise<Doc<"points"> | null>;
    }>(8);
    const producer = async () => {
      try {
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const tupleKey = await stream.current();
          if (tupleKey === null) {
            break;
          }
          const { pointId } = decodeTupleKey(tupleKey);
          try {
            await channel.push({ tupleKey, docPromise: ctx.db.get(pointId) });
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
    let continueCursor: TupleKey | undefined = undefined;
    const consumer = async () => {
      try {
        for await (const { tupleKey, docPromise } of channel) {
          const doc = await docPromise;
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
          if (page.length >= args.query.maxResults) {
            logger.debug(
              `Consumer reached max results of ${args.query.maxResults} at ${tupleKey}`,
            );
            continueCursor = tupleKey;
            return;
          }
          if (stats.rowsRead >= 1024) {
            logger.warn(
              `Consumer reached Convex query limit of 1024 rows at ${tupleKey}`,
            );
            continueCursor = tupleKey;
            return;
          }
        }
        logger.debug(`Consumer reached end of stream`);
        continueCursor = undefined;
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
      continueCursor: continueCursor ?? "",
      isDone: continueCursor === undefined,
    };
  },
});

export const nearest = query({
  args: {
    point,
    maxDistance: v.optional(v.number()),
    maxResults: v.number(),
    minLevel: v.number(),
    maxLevel: v.number(),
    levelMod: v.number(),
    nextCursor: v.optional(v.string()),
    filtering: v.array(equalityCondition),
    sorting: v.object({
      interval,
    }),
    logLevel: v.optional(logLevel),
  },
  returns: v.array(queryResultWithDistance),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);
    const s2 = await S2Bindings.load();
    if (args.maxResults === 0) {
      return [];
    }
    const query = new ClosestPointQuery(
      s2,
      logger,
      args.point,
      args.maxDistance,
      args.maxResults,
      args.minLevel,
      args.maxLevel,
      args.levelMod,
      args.filtering,
      args.sorting.interval,
    );
    const results = await query.execute(ctx);
    return results;
  },
});
