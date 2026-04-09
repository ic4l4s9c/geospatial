import { v } from "convex/values";
import { S2Bindings } from "./s2Bindings.js";
import {
  polygon,
  polyline,
  primitive,
  type QueryShape,
  rectangle,
} from "../validators.js";
import type { Point, Polygon, Rectangle, Primitive } from "../validators.js";
import type { Id } from "../_generated/dataModel.js";
import type { QueryCtx } from "../_generated/server.js";

const MAX_CANDIDATES = 1000;
const METERS_PER_DEGREE_LAT = 111_000;

export const geometryResult = v.object({
  key: v.string(),
  type: v.union(v.literal("polygon"), v.literal("polyline")),
  coordinates: v.union(polygon, polyline),
  boundingBox: rectangle,
  filterKeys: v.optional(
    v.record(v.string(), v.union(primitive, v.array(primitive))),
  ),
});

export const geometryWithDistance = geometryResult.extend({
  distance: v.number(),
});

function boundingBoxesIntersect(a: Rectangle, b: Rectangle): boolean {
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

function rectangleToPolygonPoints(rect: Rectangle): Point[] {
  return [
    { latitude: rect.south, longitude: rect.west },
    { latitude: rect.south, longitude: rect.east },
    { latitude: rect.north, longitude: rect.east },
    { latitude: rect.north, longitude: rect.west },
  ];
}

export function matchesFilterKeys(
  geometry: { filterKeys?: Record<string, Primitive | Primitive[]> },
  filterKeys?: Record<string, Primitive | Primitive[]>,
): boolean {
  if (!filterKeys) {
    return true;
  }
  if (!geometry.filterKeys) {
    return false;
  }

  return Object.entries(filterKeys).every(([key, expected]) => {
    const actual = geometry.filterKeys?.[key];

    if (Array.isArray(expected) && Array.isArray(actual)) {
      return (
        expected.length === actual.length &&
        expected.every((v, i) => actual[i] === v)
      );
    }

    if (Array.isArray(expected) || Array.isArray(actual)) {
      return false;
    }

    return actual === expected;
  });
}

export async function gatherCandidates(
  ctx: QueryCtx,
  tokens: Iterable<string>,
): Promise<{
  candidateIds: Map<Id<"geometries">, string>;
  truncated: boolean;
}> {
  const candidateIds = new Map<Id<"geometries">, string>();
  let truncated = false;

  for (const token of tokens) {
    if (candidateIds.size >= MAX_CANDIDATES) {
      truncated = true;
      break;
    }

    const matches = await ctx.db
      .query("geometryCells")
      .withIndex("byCellToken", (q) => q.eq("cellToken", token))
      .take(MAX_CANDIDATES - candidateIds.size);

    for (const match of matches) {
      candidateIds.set(match.geometryId as Id<"geometries">, match.geometryKey);
    }

    if (candidateIds.size >= MAX_CANDIDATES) {
      truncated = true;
      break;
    }
  }

  return { candidateIds, truncated };
}

type IntersectsArgs = {
  shape: QueryShape;
  maxCoveringCells: number;
  filterKeys?: Record<string, Primitive | Primitive[]>;
  limit: number;
};

export async function implIntersects(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: IntersectsArgs & { type: "polygon" },
): Promise<{
  results: {
    key: string;
    type: "polygon";
    coordinates: Polygon;
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
  }[];
  truncated: boolean;
}>;
export async function implIntersects(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: IntersectsArgs & { type: "polyline" },
): Promise<{
  results: {
    key: string;
    type: "polyline";
    coordinates: Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
  }[];
  truncated: boolean;
}>;
export async function implIntersects(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: IntersectsArgs & { type?: "polygon" | "polyline" },
): Promise<{
  results: {
    key: string;
    type: "polygon" | "polyline";
    coordinates: Polygon | Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
  }[];
  truncated: boolean;
}>;
export async function implIntersects(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: IntersectsArgs & { type?: "polygon" | "polyline" },
): Promise<{
  results: {
    key: string;
    type: "polygon" | "polyline";
    coordinates: Polygon | Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
  }[];
  truncated: boolean;
}> {
  const { shape, maxCoveringCells, filterKeys, limit, type } = args;

  // For polyline-buffer shapes we take a different path: build a bounding box
  // that covers the entire corridor, gather candidates from it, then do an
  // exact per-candidate distance test against the query polyline.
  if (shape.type === "polyline") {
    return implIntersectsPolylineBuffer(ctx, s2, {
      queryPolyline: shape.polyline,
      bufferMeters: shape.bufferMeters,
      maxCoveringCells,
      filterKeys,
      limit,
      type,
    });
  }

  let queryBbox: Rectangle;
  let queryPolygonPoints: Point[];

  if (shape.type === "rectangle") {
    queryBbox = shape.rectangle;
    queryPolygonPoints = rectangleToPolygonPoints(shape.rectangle);
  } else {
    // Polygon holes are not supported in v1.
    const poly = shape.polygon as Polygon & {
      holes?: unknown;
      interiors?: unknown;
      interior?: unknown;
    };
    if (
      (poly.holes && Array.isArray(poly.holes) && poly.holes.length > 0) ||
      (poly.interiors &&
        Array.isArray(poly.interiors) &&
        poly.interiors.length > 0) ||
      (poly.interior &&
        Array.isArray(poly.interior) &&
        poly.interior.length > 0)
    ) {
      throw new Error("Polygon holes are not supported");
    }
    const points = shape.polygon.exterior;
    queryBbox = {
      south: Math.min(...points.map((p) => p.latitude)),
      north: Math.max(...points.map((p) => p.latitude)),
      west: Math.min(...points.map((p) => p.longitude)),
      east: Math.max(...points.map((p) => p.longitude)),
    };
    queryPolygonPoints = points;
  }

  const queryCells = s2.coverPolygonForIndex(
    queryPolygonPoints,
    maxCoveringCells,
  );

  // Include ancestor cells so we match geometries indexed at coarser levels.
  const queryTokens = new Set<string>();
  for (const cellId of queryCells) {
    queryTokens.add(s2.cellIDToken(cellId));
    for (const ancestor of s2.cellAncestors(cellId)) {
      queryTokens.add(s2.cellIDToken(ancestor));
    }
  }

  const { candidateIds, truncated } = await gatherCandidates(ctx, queryTokens);

  const results: {
    key: string;
    type: "polygon" | "polyline";
    coordinates: Polygon | Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
  }[] = [];

  for (const [geometryId] of candidateIds) {
    if (results.length >= limit) {
      break;
    }

    const geometry = await ctx.db.get(geometryId);
    if (!geometry) {
      continue;
    }
    if (type && geometry.type !== type) {
      continue;
    }
    if (!matchesFilterKeys(geometry, filterKeys)) {
      continue;
    }

    // Cheap bounding box rejection before the exact S2 test.
    const geomBbox = {
      south: geometry.south,
      north: geometry.north,
      west: geometry.west,
      east: geometry.east,
    };
    if (!boundingBoxesIntersect(geomBbox, queryBbox)) {
      continue;
    }

    let doesIntersect = false;
    if (geometry.type === "polygon") {
      doesIntersect = s2.polygonIntersectsPolygon(
        (geometry.coordinates as Polygon).exterior,
        queryPolygonPoints,
      );
    } else {
      doesIntersect = s2.polylineIntersectsPolygon(
        geometry.coordinates as Point[],
        queryPolygonPoints,
      );
    }

    if (doesIntersect) {
      results.push({
        key: geometry.key,
        type: geometry.type,
        coordinates: geometry.coordinates,
        boundingBox: geomBbox,
        filterKeys: geometry.filterKeys,
      });
    }
  }

  return { results, truncated };
}

async function implIntersectsPolylineBuffer(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: {
    queryPolyline: Point[];
    bufferMeters: number;
    maxCoveringCells: number;
    filterKeys?: Record<string, Primitive | Primitive[]>;
    limit: number;
    type?: "polygon" | "polyline";
  },
): Promise<{
  results: {
    key: string;
    type: "polygon" | "polyline";
    coordinates: Polygon | Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
  }[];
  truncated: boolean;
}> {
  const {
    queryPolyline,
    bufferMeters,
    maxCoveringCells,
    filterKeys,
    limit,
    type,
  } = args;

  if (queryPolyline.length === 0) {
    return { results: [], truncated: false };
  }
  if (bufferMeters < 0) {
    throw new Error("bufferMeters must be non-negative");
  }

  // Build a bounding box that conservatively covers the buffered corridor.
  // We expand each vertex by the buffer distance and take the envelope.
  const latDelta = bufferMeters / METERS_PER_DEGREE_LAT;
  const lats = queryPolyline.map((p) => p.latitude);
  const lngs = queryPolyline.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  // Use the smallest cosLat along the polyline for the most conservative
  // (widest) longitude expansion.
  const minCosLat = Math.max(
    0.01,
    Math.min(...lats.map((lat) => Math.cos((lat * Math.PI) / 180))),
  );
  const lngDelta = Math.min(
    bufferMeters / (METERS_PER_DEGREE_LAT * minCosLat),
    180,
  );

  const searchBbox = {
    south: Math.max(-90, minLat - latDelta),
    north: Math.min(90, maxLat + latDelta),
    west: Math.max(-180, Math.min(...lngs) - lngDelta),
    east: Math.min(180, Math.max(...lngs) + lngDelta),
  };

  const searchPolygon = rectangleToPolygonPoints(searchBbox);
  const searchCells = s2.coverPolygonForIndex(searchPolygon, maxCoveringCells);

  const searchTokens = new Set<string>();
  for (const cellId of searchCells) {
    searchTokens.add(s2.cellIDToken(cellId));
    for (const ancestor of s2.cellAncestors(cellId)) {
      searchTokens.add(s2.cellIDToken(ancestor));
    }
  }

  const { candidateIds, truncated } = await gatherCandidates(ctx, searchTokens);

  const results: {
    key: string;
    type: "polygon" | "polyline";
    coordinates: Polygon | Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
  }[] = [];

  for (const [geometryId] of candidateIds) {
    if (results.length >= limit) {
      break;
    }

    const geometry = await ctx.db.get(geometryId);
    if (!geometry) {
      continue;
    }
    if (type && geometry.type !== type) {
      continue;
    }
    if (!matchesFilterKeys(geometry, filterKeys)) {
      continue;
    }

    const geomBbox = {
      south: geometry.south,
      north: geometry.north,
      west: geometry.west,
      east: geometry.east,
    };
    if (!boundingBoxesIntersect(geomBbox, searchBbox)) {
      continue;
    }

    // Exact test: does any part of the stored geometry fall within bufferMeters
    // of the query polyline?
    let withinBuffer = false;
    if (geometry.type === "polygon") {
      // A polygon is within the buffer if its exterior ring comes within
      // bufferMeters of the query polyline, OR if the query polyline passes
      // through the polygon interior.
      const polygonPoints = (geometry.coordinates as Polygon).exterior;
      const distToRing = s2.chordAngleToMeters(
        s2.distanceToPolyline(queryPolyline, polygonPoints[0]),
      );
      if (distToRing <= bufferMeters) {
        withinBuffer = true;
      } else {
        // Query polyline may be fully inside the polygon — check first vertex.
        withinBuffer = s2.polygonContainsPoint(polygonPoints, queryPolyline[0]);
      }
    } else {
      // Polyline: distance from the query polyline to any vertex of the stored
      // polyline. We check each stored vertex against the query polyline and
      // short-circuit on the first hit.
      const storedPoints = geometry.coordinates as Point[];
      for (const pt of storedPoints) {
        const dist = s2.chordAngleToMeters(
          s2.distanceToPolyline(queryPolyline, pt),
        );
        if (dist <= bufferMeters) {
          withinBuffer = true;
          break;
        }
      }
    }

    if (withinBuffer) {
      results.push({
        key: geometry.key,
        type: geometry.type,
        coordinates: geometry.coordinates,
        boundingBox: geomBbox,
        filterKeys: geometry.filterKeys,
      });
    }
  }

  return { results, truncated };
}

type NearArgs = {
  point: Point;
  maxDistance: number;
  filterKeys?: Record<string, Primitive | Primitive[]>;
  limit: number;
};

export async function implGeometriesNear(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: NearArgs & { type: "polygon" },
): Promise<{
  results: {
    key: string;
    type: "polygon";
    coordinates: Polygon;
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
    distance: number;
  }[];
  truncated: boolean;
}>;
export async function implGeometriesNear(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: NearArgs & { type: "polyline" },
): Promise<{
  results: {
    key: string;
    type: "polyline";
    coordinates: Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
    distance: number;
  }[];
  truncated: boolean;
}>;
export async function implGeometriesNear(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: NearArgs & { type?: "polygon" | "polyline" },
): Promise<{
  results: {
    key: string;
    type: "polygon" | "polyline";
    coordinates: Polygon | Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
    distance: number;
  }[];
  truncated: boolean;
}>;
export async function implGeometriesNear(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: NearArgs & { type?: "polygon" | "polyline" },
): Promise<{
  results: {
    key: string;
    type: "polygon" | "polyline";
    coordinates: Polygon | Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
    distance: number;
  }[];
  truncated: boolean;
}> {
  const { point: queryPoint, maxDistance, filterKeys, limit, type } = args;

  if (maxDistance < 0) {
    throw new Error("maxDistance must be non-negative");
  }

  // Convert maxDistance to a lat/lng bounding box. Longitude degrees shrink
  // toward the poles, so we compensate with cosLat. Near the poles we clamp
  // to ±180 to avoid division by near-zero.
  const latDelta = maxDistance / METERS_PER_DEGREE_LAT;
  const cosLat = Math.cos((queryPoint.latitude * Math.PI) / 180);
  const lngDelta =
    cosLat > 0.01
      ? Math.min(maxDistance / (METERS_PER_DEGREE_LAT * cosLat), 180)
      : 180;

  const searchBbox = {
    south: Math.max(-90, queryPoint.latitude - latDelta),
    north: Math.min(90, queryPoint.latitude + latDelta),
    west: Math.max(-180, queryPoint.longitude - lngDelta),
    east: Math.min(180, queryPoint.longitude + lngDelta),
  };

  const searchPolygon = rectangleToPolygonPoints(searchBbox);
  const searchCells = s2.coverPolygonForIndex(searchPolygon, 50);

  // Include ancestor cells so we match geometries indexed at coarser levels.
  const searchTokens = new Set<string>();
  for (const cellId of searchCells) {
    searchTokens.add(s2.cellIDToken(cellId));
    for (const ancestor of s2.cellAncestors(cellId)) {
      searchTokens.add(s2.cellIDToken(ancestor));
    }
  }

  const { candidateIds, truncated } = await gatherCandidates(ctx, searchTokens);

  const results: {
    key: string;
    type: "polygon" | "polyline";
    coordinates: Polygon | Point[];
    boundingBox: Rectangle;
    filterKeys?: Record<string, Primitive | Primitive[]>;
    distance: number;
  }[] = [];

  for (const [geometryId] of candidateIds) {
    const geometry = await ctx.db.get(geometryId);
    if (!geometry) {
      continue;
    }
    if (type && geometry.type !== type) {
      continue;
    }
    if (!matchesFilterKeys(geometry, filterKeys)) {
      continue;
    }

    // For polygons, a point inside has distance 0. For points outside,
    // measure the chord angle to the nearest edge and convert to meters.
    // For polylines, always measure to the nearest point on the line.
    let distanceMeters: number;
    if (geometry.type === "polygon") {
      const polygonPoints = (geometry.coordinates as Polygon).exterior;
      if (s2.polygonContainsPoint(polygonPoints, queryPoint)) {
        distanceMeters = 0;
      } else {
        distanceMeters = s2.chordAngleToMeters(
          s2.distanceToPolygonEdge(polygonPoints, queryPoint),
        );
      }
    } else {
      distanceMeters = s2.chordAngleToMeters(
        s2.distanceToPolyline(geometry.coordinates as Point[], queryPoint),
      );
    }

    if (distanceMeters <= maxDistance) {
      results.push({
        key: geometry.key,
        type: geometry.type,
        coordinates: geometry.coordinates,
        boundingBox: {
          south: geometry.south,
          north: geometry.north,
          west: geometry.west,
          east: geometry.east,
        },
        filterKeys: geometry.filterKeys,
        distance: distanceMeters,
      });
    }
  }

  results.sort((a, b) => a.distance - b.distance);
  return { results: results.slice(0, limit), truncated };
}
