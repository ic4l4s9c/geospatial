import { implGeometriesNear, implIntersects } from "../lib/geometryQuery.js";
import { query } from "../_generated/server.js";
import { v } from "convex/values";
import { S2Bindings } from "../lib/s2Bindings.js";
import { point, polyline, queryShape, rectangle, filterKeys } from "../validators.js";
import { equalityCondition } from "../query.js";

const polylineResult = v.object({
  key: v.string(),
  type: v.literal("polyline"),
  coordinates: polyline,
  boundingBox: rectangle,
  filterKeys: filterKeys,
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
    maxCoveringCells: v.optional(v.number()),
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(polylineResult),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implIntersects(ctx, s2, {
      shape: args.shape,
      maxCoveringCells: args.maxCoveringCells ?? 30,
      filtering: args.filtering ?? [],
      limit: args.limit ?? 100,
      type: "polyline",
      cursor: args.cursor,
    });
  },
});

/**
 * Find polylines within a given distance of a point, sorted by distance ascending.
 */
export const nearest = query({
  args: {
    point: point,
    maxDistance: v.optional(v.number()),
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(polylineWithDistance),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implGeometriesNear(ctx, s2, {
      point: args.point,
      maxDistance: args.maxDistance,
      filtering: args.filtering ?? [],
      maxResults: args.limit ?? 100,
      type: "polyline",
      cursor: args.cursor,
    });
  },
});
