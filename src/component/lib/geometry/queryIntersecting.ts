import type {
  Point,
  Polygon,
  QueryShape,
  Rectangle,
} from "../../validators.js";
import type { QueryCtx } from "../../_generated/server.js";
import type { Logger } from "../logging.js";
import type {
  AnyGeometryResult,
  FilterCondition,
  GeometryResult,
} from "./types.js";
import { S2Bindings } from "../s2Bindings.js";
import { decodeCursor, encodeCursor } from "../cursor.js";
import { gatherCandidates } from "./candidates.js";
import {
  boundingBoxesIntersect,
  geometryBbox,
  rectangleToPolygonPoints,
} from "./bbox.js";
import { matchesFilterConditions, splitFilters } from "./filterConditions.js";

const METERS_PER_DEGREE_LAT = 111_000;

type IntersectsArgs<T extends "polygon" | "polyline" = "polygon" | "polyline"> =
  {
    shape: QueryShape;
    minLevel?: number;
    maxLevel?: number;
    levelMod?: number;
    maxCells: number;
    filtering: FilterCondition[];
    limit: number;
    cursor?: string;
    type?: T;
  };

export async function queryIntersecting<
  T extends "polygon" | "polyline" = "polygon" | "polyline",
>(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: IntersectsArgs<T>,
  logger?: Logger,
): Promise<{ results: GeometryResult<T>[]; nextCursor?: string }> {
  const {
    shape,
    minLevel,
    maxLevel,
    levelMod,
    maxCells,
    filtering,
    limit,
    type,
  } = args;

  if (shape.type === "polyline") {
    return queryIntersectingPolylineBuffer(ctx, s2, {
      queryPolyline: shape.polyline,
      bufferMeters: shape.bufferMeters,
      minLevel,
      maxLevel,
      levelMod,
      maxCells,
      filtering,
      limit,
      type,
      cursor: args.cursor,
    });
  }

  const { mustFilters, shouldFilters } = splitFilters(filtering);

  let queryBbox: Rectangle;
  let queryPolygonPoints: Point[];

  if (shape.type === "rectangle") {
    queryBbox = shape.rectangle;
    queryPolygonPoints = rectangleToPolygonPoints(shape.rectangle);
  } else {
    const points = shape.polygon.exterior;
    queryBbox = {
      south: Math.min(...points.map((p) => p.latitude)),
      north: Math.max(...points.map((p) => p.latitude)),
      west: Math.min(...points.map((p) => p.longitude)),
      east: Math.max(...points.map((p) => p.longitude)),
    };
    queryPolygonPoints = points;
  }

  const queryTokens = new Set<string>();
  for (const cellId of s2.filterCellsByLevel(
    s2.coverPolygonForIndex(queryPolygonPoints, maxCells),
    minLevel,
    maxLevel,
    levelMod,
  )) {
    queryTokens.add(s2.cellIDToken(cellId));
    for (const ancestor of s2.cellAncestors(cellId)) {
      queryTokens.add(s2.cellIDToken(ancestor));
    }
  }

  const { candidateIds } = await gatherCandidates(ctx, queryTokens);
  const cursorData = args.cursor ? decodeCursor(args.cursor) : undefined;
  const results: AnyGeometryResult[] = [];

  for (const [geometryId] of candidateIds) {
    if (results.length >= limit) break;

    const geometry = await ctx.db.get(geometryId);
    if (!geometry) continue;
    if (type && geometry.type !== type) continue;
    if (!matchesFilterConditions(geometry, mustFilters, shouldFilters))
      continue;

    if (cursorData) {
      const { sortKey, key } = geometry;
      if (
        sortKey < cursorData.sortKey ||
        (sortKey === cursorData.sortKey && key <= cursorData.secondary)
      )
        continue;
    }

    const geomBbox = geometryBbox(geometry);
    if (!boundingBoxesIntersect(geomBbox, queryBbox)) continue;

    const doesIntersect =
      geometry.type === "polygon"
        ? s2.polygonIntersectsPolygon(
            (geometry.coordinates as Polygon).exterior,
            queryPolygonPoints,
          )
        : s2.polylineIntersectsPolygon(
            geometry.coordinates as Point[],
            queryPolygonPoints,
          );

    if (doesIntersect) {
      results.push({
        key: geometry.key,
        type: geometry.type,
        coordinates: geometry.coordinates,
        boundingBox: geomBbox,
        filterKeys: geometry.filterKeys,
        sortKey: geometry.sortKey,
      } as AnyGeometryResult);
    }
  }

  const nextCursor =
    results.length === limit
      ? encodeCursor({
          sortKey: results[results.length - 1].sortKey,
          secondary: results[results.length - 1].key,
        })
      : undefined;

  return { results: results as GeometryResult<T>[], nextCursor };
}

async function queryIntersectingPolylineBuffer<
  T extends "polygon" | "polyline" = "polygon" | "polyline",
>(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: {
    queryPolyline: Point[];
    bufferMeters: number;
    minLevel?: number;
    maxLevel?: number;
    levelMod?: number;
    maxCells: number;
    filtering: FilterCondition[];
    limit: number;
    type?: T;
    cursor?: string;
  },
): Promise<{ results: GeometryResult<T>[]; nextCursor?: string }> {
  const {
    queryPolyline,
    bufferMeters,
    minLevel,
    maxLevel,
    levelMod,
    maxCells,
    filtering,
    limit,
    type,
    cursor,
  } = args;

  if (queryPolyline.length === 0) return { results: [], nextCursor: undefined };
  if (bufferMeters < 0) throw new Error("bufferMeters must be non-negative");

  const { mustFilters, shouldFilters } = splitFilters(filtering);

  const lats = queryPolyline.map((p) => p.latitude);
  const lngs = queryPolyline.map((p) => p.longitude);
  const latDelta = bufferMeters / METERS_PER_DEGREE_LAT;
  const minCosLat = Math.max(
    0.01,
    Math.min(...lats.map((lat) => Math.cos((lat * Math.PI) / 180))),
  );
  const lngDelta = Math.min(
    bufferMeters / (METERS_PER_DEGREE_LAT * minCosLat),
    180,
  );

  const searchBbox = {
    south: Math.max(-90, Math.min(...lats) - latDelta),
    north: Math.min(90, Math.max(...lats) + latDelta),
    west: Math.max(-180, Math.min(...lngs) - lngDelta),
    east: Math.min(180, Math.max(...lngs) + lngDelta),
  };

  const searchTokens = new Set<string>();
  for (const cellId of s2.filterCellsByLevel(
    s2.coverPolygonForIndex(rectangleToPolygonPoints(searchBbox), maxCells),
    minLevel,
    maxLevel,
    levelMod,
  )) {
    searchTokens.add(s2.cellIDToken(cellId));
    for (const ancestor of s2.cellAncestors(cellId)) {
      searchTokens.add(s2.cellIDToken(ancestor));
    }
  }

  const { candidateIds } = await gatherCandidates(ctx, searchTokens);
  const cursorData = cursor ? decodeCursor<number, string>(cursor) : undefined;
  const results: AnyGeometryResult[] = [];

  for (const [geometryId] of candidateIds) {
    if (results.length >= limit) break;

    const geometry = await ctx.db.get(geometryId);
    if (!geometry) continue;
    if (type && geometry.type !== type) continue;
    if (!matchesFilterConditions(geometry, mustFilters, shouldFilters))
      continue;

    if (cursorData) {
      const { sortKey, key } = geometry;
      if (
        sortKey < cursorData.sortKey ||
        (sortKey === cursorData.sortKey && key <= cursorData.secondary)
      )
        continue;
    }

    const geomBbox = geometryBbox(geometry);
    if (!boundingBoxesIntersect(geomBbox, searchBbox)) continue;

    let withinBuffer: boolean;
    if (geometry.type === "polygon") {
      const polygonPoints = (geometry.coordinates as Polygon).exterior;
      withinBuffer =
        s2.chordAngleToMeters(
          s2.distanceToPolyline(queryPolyline, polygonPoints[0]),
        ) <= bufferMeters ||
        s2.polygonContainsPoint(polygonPoints, queryPolyline[0]);
    } else {
      withinBuffer = (geometry.coordinates as Point[]).some(
        (pt) =>
          s2.chordAngleToMeters(s2.distanceToPolyline(queryPolyline, pt)) <=
          bufferMeters,
      );
    }

    if (withinBuffer) {
      results.push({
        key: geometry.key,
        type: geometry.type,
        coordinates: geometry.coordinates,
        boundingBox: geomBbox,
        filterKeys: geometry.filterKeys,
        sortKey: geometry.sortKey,
      } as AnyGeometryResult);
    }
  }

  const nextCursor =
    results.length === limit
      ? encodeCursor({
          sortKey: results[results.length - 1].sortKey,
          secondary: results[results.length - 1].key,
        })
      : undefined;

  return { results: results as GeometryResult<T>[], nextCursor };
}
