import { query } from "../_generated/server.js";
import { v } from "convex/values";
import { S2Bindings } from "../lib/s2Bindings.js";
import { point, polyline } from "../types.js";

/**
 * Calculate the length of a polyline in meters.
 * Uses great-circle distance on Earth's surface.
 */
export const length = query({
  args: {
    polyline: polyline,
  },
  returns: v.number(),
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    return s2.polylineLength(args.polyline);
  },
});

/**
 * Calculate the centroid of a polyline.
 * Returns the weighted center point along the line.
 */
export const centroid = query({
  args: {
    polyline: polyline,
  },
  returns: point,
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    return s2.polylineCentroid(args.polyline);
  },
});
