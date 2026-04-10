import type { Point, Rectangle } from "../../validators.js";

export function boundingBoxesIntersect(a: Rectangle, b: Rectangle): boolean {
  return !(
    a.east < b.west ||
    b.east < a.west ||
    a.north < b.south ||
    b.north < a.south
  );
}

export function boundingBoxContainsPoint(
  bbox: Rectangle,
  point: Point,
): boolean {
  return (
    point.latitude >= bbox.south &&
    point.latitude <= bbox.north &&
    point.longitude >= bbox.west &&
    point.longitude <= bbox.east
  );
}

export function rectangleToPolygonPoints(rect: Rectangle): Point[] {
  return [
    { latitude: rect.south, longitude: rect.west },
    { latitude: rect.south, longitude: rect.east },
    { latitude: rect.north, longitude: rect.east },
    { latitude: rect.north, longitude: rect.west },
  ];
}

export function geometryBbox(geometry: {
  south: number;
  north: number;
  west: number;
  east: number;
}): Rectangle {
  return {
    south: geometry.south,
    north: geometry.north,
    west: geometry.west,
    east: geometry.east,
  };
}
