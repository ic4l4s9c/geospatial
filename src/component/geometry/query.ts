import { query } from "../_generated/server.js";
import { v } from "convex/values";
import {
  geometryResult,
  geometryWithDistance,
  implGeometriesNear,
  implIntersects,
  implList,
} from "../lib/geometryQuery.js";
import { polygon, primitive, rectangle } from "../validators.js";
import { S2Bindings } from "../lib/s2Bindings.js";

/**
 * List all stored geometries.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(geometryResult),
  handler: async (ctx, args) => {
    return implList(ctx, { limit: args.limit ?? 100 });
  },
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
    shape: v.union(
      v.object({ type: v.literal("rectangle"), rectangle }),
      v.object({ type: v.literal("polygon"), polygon }),
    ),
    maxCoveringCells: v.optional(v.number()),
    filterKeys: v.optional(v.record(v.string(), v.union(primitive, v.array(primitive)))),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    results: v.array(geometryResult),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implIntersects(ctx, s2, {
      shape: args.shape,
      maxCoveringCells: args.maxCoveringCells ?? 30,
      filterKeys: args.filterKeys,
      limit: args.limit ?? 100,
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
export const geometriesNear = query({
  args: {
    point: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    maxDistance: v.number(),
    filterKeys: v.optional(v.record(v.string(), v.union(primitive, v.array(primitive)))),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    results: v.array(geometryWithDistance),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implGeometriesNear(ctx, s2, {
      point: args.point,
      maxDistance: args.maxDistance,
      filterKeys: args.filterKeys,
      limit: args.limit ?? 100,
    });
  },
});
