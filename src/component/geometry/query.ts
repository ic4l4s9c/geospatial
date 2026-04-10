import { query } from "../_generated/server.js";
import { v } from "convex/values";
import {
  geometryResult,
  geometryWithDistance,
  implGeometriesNear,
  implIntersects,
} from "../lib/geometryQuery.js";
import { point, queryShape } from "../validators.js";
import { S2Bindings } from "../lib/s2Bindings.js";
import { equalityCondition } from "../query.js";

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
    maxCoveringCells: v.optional(v.number()),
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(geometryResult),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implIntersects(ctx, s2, {
      shape: args.shape,
      maxCoveringCells: args.maxCoveringCells ?? 30,
      filtering: args.filtering ?? [],
      limit: args.limit ?? 100,
      cursor: args.cursor,
    });
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
    maxDistance: v.optional(v.number()),
    filtering: v.array(equalityCondition),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(geometryWithDistance),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implGeometriesNear(ctx, s2, {
      point: args.point,
      maxDistance: args.maxDistance,
      filtering: args.filtering,
      maxResults: args.limit ?? 100,
      cursor: args.cursor,
    });
  },
});
