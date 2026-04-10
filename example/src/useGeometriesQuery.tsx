import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Point, Polygon } from "@convex-dev/geospatial";

/**
 * Hook to query which geometries contain a given point.
 */
export function useContainsPointQuery(point: Point | null) {
  const result = useQuery(
    api.example.geometryContainsPoint,
    point ? { point } : "skip",
  );

  return {
    results: result?.results ?? [],
    truncated: !!result?.nextCursor,
    loading: point !== null && result === undefined,
  };
}

/**
 * Hook to query geometries near a point.
 */
export function useGeometriesNearQuery(
  point: Point | null,
  maxDistance: number,
) {
  const result = useQuery(
    api.example.geometriesNearPoint,
    point ? { point, maxDistance } : "skip",
  );

  return {
    results: result?.results ?? [],
    truncated: !!result?.nextCursor,
    loading: point !== null && result === undefined,
  };
}

/**
 * Hook to get measurements for a polygon.
 */
export function usePolygonMeasurements(polygon: Polygon | null) {
  const result = useQuery(
    api.example.measurePolygon,
    polygon ? { polygon } : "skip",
  );

  return {
    area: result?.area ?? null,
    perimeter: result?.perimeter ?? null,
    centroid: result?.centroid ?? null,
    loading: polygon !== null && result === undefined,
  };
}
