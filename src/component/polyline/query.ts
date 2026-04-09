import {
  implGeometriesNear,
  implIntersects,
} from "../lib/geometryQuery.js";
import { query } from "../_generated/server.js";
import { v } from "convex/values";
import { primitive } from "../lib/primitive.js";
import { S2Bindings } from "../lib/s2Bindings.js";
import { point, polyline, queryShape, rectangle } from "../validators.js";

const polylineResult = v.object({
  key: v.string(),
  type: v.literal("polyline"),
  coordinates: polyline,
  boundingBox: rectangle,
  filterKeys: v.optional(
    v.record(v.string(), v.union(primitive, v.array(primitive))),
  ),
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
    filterKeys: v.optional(
      v.record(v.string(), v.union(primitive, v.array(primitive))),
    ),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    results: v.array(polylineResult),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implIntersects(ctx, s2, {
      shape: args.shape,
      maxCoveringCells: args.maxCoveringCells ?? 30,
      filterKeys: args.filterKeys,
      limit: args.limit ?? 100,
      type: "polyline",
    });
  },
});

/**
 * Find polylines within a given distance of a point, sorted by distance ascending.
 */
export const near = query({
  args: {
    point: point,
    maxDistance: v.number(),
    filterKeys: v.optional(
      v.record(v.string(), v.union(primitive, v.array(primitive))),
    ),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    results: v.array(polylineWithDistance),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implGeometriesNear(ctx, s2, {
      point: args.point,
      maxDistance: args.maxDistance,
      filterKeys: args.filterKeys,
      limit: args.limit ?? 100,
      type: "polyline",
    });
  },
});
