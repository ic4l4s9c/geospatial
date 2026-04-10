import { v, type Infer } from "convex/values";
import { primitive } from "./lib/primitive.js";

export type { Primitive } from "./lib/primitive.js";
export { primitive } from "./lib/primitive.js";

// Latitudes are in degrees.
export const latitude = v.number();
export type Latitude = Infer<typeof latitude>;

// Longitudes are in degrees.
export const longitude = v.number();
export type Longitude = Infer<typeof longitude>;

export const point = v.object({
  latitude,
  longitude,
});
export type Point = Infer<typeof point>;

export const rectangle = v.object({
  west: longitude,
  east: longitude,
  south: latitude,
  north: latitude,
});
export type Rectangle = Infer<typeof rectangle>;

// Polygon defined by exterior ring (and optional holes for future support)
export const polygon = v.object({
  exterior: v.array(point),
  holes: v.optional(v.array(v.array(point))),
});
export type Polygon = Infer<typeof polygon>;

// Polyline defined by an array of points (at least 2)
export const polyline = v.array(point);
export type Polyline = Infer<typeof polyline>;

export const queryShape = v.union(
  v.object({ type: v.literal("rectangle"), rectangle: rectangle }),
  v.object({
    type: v.literal("polygon"),
    polygon: polygon,
  }),
  v.object({
    type: v.literal("polyline"),
    polyline: polyline,
    bufferMeters: v.number(),
  }),
);
export type QueryShape = Infer<typeof queryShape>;

export const filterKeys = v.optional(
  v.record(v.string(), v.union(primitive, v.array(primitive))),
);

export type Meters = number;
export type ChordAngle = number;
