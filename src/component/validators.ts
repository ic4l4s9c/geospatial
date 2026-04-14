import { v, type Infer } from "convex/values";

export type { Primitive } from "./validators/primitive.js";
export { primitive } from "./validators/primitive.js";

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

export type Meters = number;
export type ChordAngle = number;
