import type { Point, Rectangle } from "../../validators.js";

export function computeBoundingBox(points: Point[]): Rectangle {
  if (points.length === 0) {
    throw new Error("Cannot compute bounding box for empty points array");
  }
  let south = Infinity,
    north = -Infinity;
  let west = Infinity,
    east = -Infinity;

  for (const p of points) {
    south = Math.min(south, p.latitude);
    north = Math.max(north, p.latitude);
    west = Math.min(west, p.longitude);
    east = Math.max(east, p.longitude);
  }

  return { south, north, west, east };
}
