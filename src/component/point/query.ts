import { v, type Infer } from "convex/values";
import {
  equalityCondition,
  type Point,
  point,
  queryShape,
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
import { PREFETCH_SIZE } from "../streams/constants.js";
import { ClosestPointQuery } from "../lib/pointQuery.js";

export { PREFETCH_SIZE } from "../streams/constants.js";

const geospatialQuery = v.object({
  shape: queryShape,
  filtering: v.array(equalityCondition),
  sorting: v.object({
    interval,
  }),
  maxResults: v.number(),
});

const queryResult = v.object({
  key: v.string(),
  coordinates: point,
});

const executeResult = v.object({
  results: v.array(queryResult),
  nextCursor: v.optional(v.string()),
});
type ExecuteResult = Infer<typeof executeResult>;

export const execute = query({
  args: {
    query: geospatialQuery,
    cursor: v.optional(v.string()),
    minLevel: v.number(),
    maxLevel: v.number(),
    levelMod: v.number(),
    maxCells: v.number(),
    logLevel,
  },
  returns: executeResult,
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);

    const s2 = await S2Bindings.load();

    logger.time("execute");
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
        return { results: [] } as ExecuteResult;
      }
    }
    const { shape } = args.query;

    let cellIDs: bigint[];
    let containsPoint: (p: Point) => boolean;

    if (shape.type === "rectangle") {
      cellIDs = s2.coverRectangle(
        shape.rectangle,
        args.minLevel,
        args.maxLevel,
        args.levelMod,
        args.maxCells,
      );
      containsPoint = (p) => s2.rectangleContains(shape.rectangle, p);
    } else if (shape.type === "polygon") {
      const poly = shape.polygon as typeof shape.polygon & {
        holes?: unknown;
        interiors?: unknown;
        interior?: unknown;
      };
      if (
        (poly.holes && Array.isArray(poly.holes) && poly.holes.length > 0) ||
        (poly.interiors &&
          Array.isArray(poly.interiors) &&
          poly.interiors.length > 0) ||
        (poly.interior &&
          Array.isArray(poly.interior) &&
          poly.interior.length > 0)
      ) {
        throw new Error("Polygon holes are not supported");
      }
      const exterior = shape.polygon.exterior;
      cellIDs = s2.coverPolygon(
        exterior,
        args.minLevel,
        args.maxLevel,
        args.levelMod,
        args.maxCells,
      );
      containsPoint = (p) => s2.polygonContainsPoint(exterior, p);
    } else {
      const polylinePoints = shape.polyline;
      const bufferMeters = shape.bufferMeters;

      if (polylinePoints.length < 2) {
        throw new Error("Polyline must have at least 2 points");
      }
      if (bufferMeters < 0) {
        throw new Error("bufferMeters must be non-negative");
      }

      const maxLevelDiff = 4;
      cellIDs = s2.coverPolylineBuffered(
        polylinePoints,
        bufferMeters,
        args.minLevel,
        args.maxLevel,
        args.levelMod,
        args.maxCells,
        maxLevelDiff,
      );
      const bufferChordAngle = s2.metersToChordAngle(bufferMeters);
      containsPoint = (p) => {
        const distance = s2.distanceToPolyline(polylinePoints, p);
        return distance <= bufferChordAngle;
      };
    }

    const cells = cellIDs.map((cellID) => s2.cellIDToken(cellID));
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

    const channel = new Channel<{
      tupleKey: Cursor;
      docPromise: Promise<Doc<"points"> | null>;
    }>(8);
    const producer = async () => {
      try {
        while (true) {
          const tupleKey = await stream.current();
          if (tupleKey === null) {
            break;
          }
          const { secondary: pointId } = decodeCursor(tupleKey);
          const pointIdTyped = pointId as Id<"points">;
          try {
            await channel.push({
              tupleKey,
              docPromise: ctx.db.get(pointIdTyped),
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
          channel.close(false);
        }
      }
      logger.debug("Producer shutting down");
    };
    const results: { key: string; coordinates: Point }[] = [];
    let nextCursor: Cursor | undefined = undefined;
    const consumer = async () => {
      try {
        for await (const { tupleKey, docPromise } of channel) {
          const doc = await docPromise;
          if (doc === null) {
            throw new Error("Internal error: document not found");
          }

          const contains = containsPoint(doc.coordinates);
          if (!contains) {
            stats.rowsPostFiltered++;
            continue;
          }
          results.push({
            key: doc.key,
            coordinates: doc.coordinates,
          });
          if (results.length >= args.query.maxResults) {
            logger.debug(
              `Consumer reached max results of ${args.query.maxResults} at ${tupleKey}`,
            );
            nextCursor = tupleKey;
            return;
          }
          if (stats.rowsRead >= 1024) {
            logger.warn(
              `Consumer reached Convex query limit of 1024 rows at ${tupleKey}`,
            );
            nextCursor = tupleKey;
            return;
          }
        }
        logger.debug(`Consumer reached end of stream`);
        nextCursor = undefined;
        return;
      } finally {
        if (!channel.closed) {
          channel.close(true);
        }
      }
    };
    await Promise.all([producer(), consumer()]);
    logger.info(`Found ${results.length} results (${JSON.stringify(stats)})`);
    logger.timeEnd("execute");

    return { results, nextCursor };
  },
});

const queryResultWithDistance = queryResult.extend({
  distance: v.number(),
});

export const nearest = query({
  args: {
    point,
    maxDistance: v.optional(v.number()),
    maxResults: v.number(),
    minLevel: v.number(),
    maxLevel: v.number(),
    levelMod: v.number(),
    cursor: v.optional(v.string()),
    filtering: v.array(equalityCondition),
    sorting: v.object({
      interval,
    }),
    logLevel,
  },
  returns: v.object({
    results: v.array(queryResultWithDistance),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);
    const s2 = await S2Bindings.load();
    if (args.maxResults === 0) {
      return { results: [], nextCursor: undefined };
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
      args.cursor,
    );
    const result = await query.execute(ctx);
    return result;
  },
});
