import { query } from "../_generated/server.js";
import { v } from "convex/values";
import { S2Bindings } from "../lib/s2Bindings.js";
import { point, polygon } from "../validators.js";


/**
 * Calculate the perimeter of a polygon in meters.
 * Uses great-circle distance on Earth's surface.
 */
export const perimeter = query({
  args: {
    polygon: polygon,
  },
  returns: v.number(),
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    return s2.polygonPerimeter(args.polygon.exterior);
  },
});

/**
 * Calculate the area of a polygon in square meters.
 * Uses spherical geometry on Earth's surface.
 */
export const area = query({
  args: {
    polygon: polygon,
  },
  returns: v.number(),
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    return s2.polygonArea(args.polygon.exterior);
  },
});

/**
 * Calculate the centroid of a polygon.
 * Returns the geographic center point.
 */
export const centroid = query({
  args: {
    polygon: polygon,
  },
  returns: point,
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    return s2.polygonCentroid(args.polygon.exterior);
  },
});
