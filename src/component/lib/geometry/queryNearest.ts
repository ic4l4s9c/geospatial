import type { Point, Polygon } from "../../validators.js";
import type { QueryCtx } from "../../_generated/server.js";
import type { Logger } from "../logging.js";
import type {
  AnyGeometryResult,
  FilterCondition,
  GeometryResult,
  WithDistance,
} from "./types.js";
import { S2Bindings } from "../s2Bindings.js";
import { decodeCursor, encodeCursor } from "../cursor.js";
import { gatherCandidates } from "./candidates.js";
import { rectangleToPolygonPoints } from "./bbox.js";
import { matchesFilterConditions, splitFilters } from "./filterConditions.js";

const METERS_PER_DEGREE_LAT = 111_000;

type NearArgs<T extends "polygon" | "polyline" = "polygon" | "polyline"> = {
  point: Point;
  minLevel?: number;
  maxLevel?: number;
  levelMod?: number;
  maxCells?: number;
  maxDistance?: number;
  filtering: FilterCondition[];
  maxResults: number;
  cursor?: string;
  type?: T;
};

export async function queryNearest<
  T extends "polygon" | "polyline" = "polygon" | "polyline",
>(
  ctx: QueryCtx,
  s2: Awaited<ReturnType<typeof S2Bindings.load>>,
  args: NearArgs<T>,
  logger?: Logger,
): Promise<{
  results: WithDistance<GeometryResult<T>>[];
  nextCursor?: string;
}> {
  const {
    point: queryPoint,
    minLevel,
    maxLevel,
    levelMod,
    maxCells,
    maxDistance,
    filtering,
    maxResults,
    type,
    cursor,
  } = args;

  if (maxDistance !== undefined && maxDistance < 0) {
    throw new Error("maxDistance must be non-negative");
  }

  const { mustFilters, shouldFilters } = splitFilters(filtering);
  const cursorData = cursor ? decodeCursor(cursor) : undefined;

  const searchTokens = new Set<string>();
  if (maxDistance !== undefined) {
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
  } else {
    for (const cellId of s2.filterCellsByLevel(
      s2.initialCells(0),
      minLevel,
      maxLevel,
      levelMod,
    )) {
      searchTokens.add(s2.cellIDToken(cellId));
    }
  }

  const { candidateIds } = await gatherCandidates(ctx, searchTokens);
  const results = [];

  for (const [geometryId] of candidateIds) {
    const geometry = await ctx.db.get(geometryId);
    if (!geometry) continue;
    if (type && geometry.type !== type) continue;
    if (!matchesFilterConditions(geometry, mustFilters, shouldFilters))
      continue;

    const distanceMeters =
      geometry.type === "polygon"
        ? s2.polygonContainsPoint(
            (geometry.coordinates as Polygon).exterior,
            queryPoint,
          )
          ? 0
          : s2.chordAngleToMeters(
              s2.distanceToPolygonEdge(
                (geometry.coordinates as Polygon).exterior,
                queryPoint,
              ),
            )
        : s2.chordAngleToMeters(
            s2.distanceToPolyline(geometry.coordinates as Point[], queryPoint),
          );

    if (maxDistance !== undefined && distanceMeters > maxDistance) continue;

    if (cursorData) {
      if (
        distanceMeters < cursorData.sortKey ||
        (distanceMeters === cursorData.sortKey &&
          geometry.key <= cursorData.secondary)
      ) {
        continue;
      }
    }

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
      sortKey: geometry.sortKey,
      distance: distanceMeters,
    } as WithDistance<AnyGeometryResult>);
  }

  results.sort((a, b) => a.distance - b.distance);
  const slicedResults = results.slice(0, maxResults);

  const nextCursor =
    slicedResults.length === maxResults && results.length > maxResults
      ? encodeCursor({
          sortKey: slicedResults[slicedResults.length - 1].distance,
          secondary: slicedResults[slicedResults.length - 1].key,
        })
      : undefined;

  return {
    results: slicedResults as WithDistance<GeometryResult<T>>[],
    nextCursor,
  };
}
