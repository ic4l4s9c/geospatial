import type { Point, Polygon, Rectangle } from "../../validators.js";

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

export function boundingBoxContainsPoint(
  bbox: Rectangle,
  point: Point,
): boolean {
  const { south, north, west, east } = bbox;
  const { latitude, longitude } = point;

  if (west <= east) {
    return (
      latitude >= south &&
      latitude <= north &&
      longitude >= west &&
      longitude <= east
    );
  }
  if (west > east) {
    return (
      latitude >= south &&
      latitude <= north &&
      (longitude >= west || longitude <= east)
    );
  }
  return false;
}

export function boundingBoxContainsPolygon(
  bbox: Rectangle,
  polygon: Polygon,
): boolean {
  const exterior = polygon.exterior;
  if (exterior.length === 0) {
    return false;
  }
  return exterior.every((point) => boundingBoxContainsPoint(bbox, point));
}

export function boundingBoxesIntersect(a: Rectangle, b: Rectangle): boolean {
  if (a.south > b.north || a.north < b.south) {
    return false;
  }
  if (a.west <= a.east && b.west <= b.east) {
    return a.east >= b.west && a.west <= b.east;
  }
  if (a.west > a.east && b.west > b.east) {
    return true;
  }
  if (a.west <= a.east) {
    return a.east >= b.west || a.west <= b.east;
  }
  return b.east >= a.west || b.west <= a.east;
}
