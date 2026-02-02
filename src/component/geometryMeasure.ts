import { query } from "./_generated/server.js";
import { v } from "convex/values";
import { S2Bindings } from "./lib/s2Bindings.js";
import { polygon, polyline } from "./types.js";

export const polygonArea = query({
  args: {
    polygon: polygon,
  },
  returns: v.number(),
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    return s2.polygonArea(args.polygon.exterior);
  },
});

export const polylineLength = query({
  args: {
    polyline: polyline,
  },
  returns: v.number(),
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    return s2.polylineLength(args.polyline);
  },
});

export const polygonPerimeter = query({
  args: {
    polygon: polygon,
  },
  returns: v.number(),
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    return s2.polygonPerimeter(args.polygon.exterior);
  },
});

export const polygonCentroid = query({
  args: {
    polygon: polygon,
  },
  returns: v.object({
    latitude: v.number(),
    longitude: v.number(),
  }),
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    return s2.polygonCentroid(args.polygon.exterior);
  },
});

export const polylineCentroid = query({
  args: {
    polyline: polyline,
  },
  returns: v.object({
    latitude: v.number(),
    longitude: v.number(),
  }),
  handler: async (_ctx, args) => {
    const s2 = await S2Bindings.load();
    return s2.polylineCentroid(args.polyline);
  },
});
