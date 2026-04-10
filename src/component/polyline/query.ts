import { query } from "../_generated/server.js";
import { v } from "convex/values";
import { S2Bindings } from "../lib/s2Bindings.js";
import {
  point,
  polyline,
  queryShape,
  rectangle,
  filterKeys,
  equalityCondition,
} from "../validators.js";
import { createLogger, logLevel } from "../lib/logging.js";
import { queryNearest } from "../lib/geometry/queryNearest.js";
import { queryIntersecting } from "../lib/geometry/queryIntersecting.js";

const polylineResult = v.object({
  key: v.string(),
  type: v.literal("polyline"),
  coordinates: polyline,
  boundingBox: rectangle,
  filterKeys: filterKeys,
  sortKey: v.number(),
});

const polylineWithDistance = polylineResult.extend({
  distance: v.number(),
});

/**
 * Find all polylines that intersect a given shape.
 */
export const intersects = query({
  args: {
    shape: queryShape,
    minLevel: v.optional(v.number()),
    maxLevel: v.optional(v.number()),
    levelMod: v.optional(v.number()),
    maxCells: v.optional(v.number()),
    logLevel,
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(polylineResult),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);
    const s2 = await S2Bindings.load();
    return queryIntersecting<"polyline">(
      ctx,
      s2,
      {
        shape: args.shape,
        minLevel: args.minLevel,
        maxLevel: args.maxLevel,
        levelMod: args.levelMod,
        maxCells: args.maxCells ?? 30,
        filtering: args.filtering ?? [],
        limit: args.limit ?? 100,
        type: "polyline",
        cursor: args.cursor,
      },
      logger,
    );
  },
});

/**
 * Find polylines within a given distance of a point, sorted by distance ascending.
 */
export const nearest = query({
  args: {
    point: point,
    minLevel: v.optional(v.number()),
    maxLevel: v.optional(v.number()),
    levelMod: v.optional(v.number()),
    maxCells: v.optional(v.number()),
    maxDistance: v.optional(v.number()),
    logLevel,
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(polylineWithDistance),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);
    const s2 = await S2Bindings.load();
    return queryNearest<"polyline">(
      ctx,
      s2,
      {
        point: args.point,
        minLevel: args.minLevel,
        maxLevel: args.maxLevel,
        levelMod: args.levelMod,
        maxCells: args.maxCells,
        maxDistance: args.maxDistance,
        filtering: args.filtering ?? [],
        maxResults: args.limit ?? 100,
        type: "polyline",
        cursor: args.cursor,
      },
      logger,
    );
  },
});
