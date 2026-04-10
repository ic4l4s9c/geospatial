import { query } from "../_generated/server.js";
import { v } from "convex/values";
import {
  point,
  queryShape,
  equalityCondition,
  rectangle,
  polygon,
  polyline,
  filterKeys,
} from "../validators.js";
import { S2Bindings } from "../lib/s2Bindings.js";
import { createLogger, logLevel } from "../lib/logging.js";
import { queryNearest } from "../lib/geometry/queryNearest.js";
import { queryIntersecting } from "../lib/geometry/queryIntersecting.js";

export const geometryResult = v.object({
  key: v.string(),
  type: v.union(v.literal("polygon"), v.literal("polyline")),
  coordinates: v.union(polygon, polyline),
  boundingBox: rectangle,
  filterKeys: filterKeys,
});

export const geometryWithDistance = geometryResult.extend({
  distance: v.number(),
});

/**
 * Find all geometries of any type that intersect a given shape.
 *
 * Covers the query shape with S2 cells, expands to ancestor cells so that
 * geometries indexed at coarser levels are not missed, then runs an exact
 * intersection test against each candidate.
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
    results: v.array(geometryResult),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);
    const s2 = await S2Bindings.load();
    return queryIntersecting(
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
        cursor: args.cursor,
      },
      logger,
    );
  },
});

/**
 * Find geometries of any type within a given distance of a point.
 *
 * Approximates the search area as a bounding box, covers it with S2 cells,
 * then computes the exact distance from each candidate geometry to the query
 * point. Results are returned sorted by distance ascending.
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
    filtering: v.array(equalityCondition),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(geometryWithDistance),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);
    const s2 = await S2Bindings.load();
    return queryNearest(
      ctx,
      s2,
      {
        point: args.point,
        minLevel: args.minLevel,
        maxLevel: args.maxLevel,
        levelMod: args.levelMod,
        maxCells: args.maxCells,
        maxDistance: args.maxDistance,
        filtering: args.filtering,
        maxResults: args.limit ?? 100,
        cursor: args.cursor,
      },
      logger,
    );
  },
});
