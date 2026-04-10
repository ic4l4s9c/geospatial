import { v } from "convex/values";
import { query } from "../_generated/server.js";
import {
  point,
  type Polygon,
  polygon,
  type Primitive,
  primitive,
  queryShape,
  type Rectangle,
  rectangle,
} from "../validators.js";
import { S2Bindings } from "../lib/s2Bindings.js";
import {
  boundingBoxContainsPoint,
  gatherCandidates,
  implGeometriesNear,
  implIntersects,
  matchesFilterConditions,
} from "../lib/geometryQuery.js";
import { equalityCondition } from "../query.js";
import { decodeCursor, encodeCursor } from "../lib/cursor.js";

const polygonResult = v.object({
  key: v.string(),
  type: v.literal("polygon"),
  coordinates: polygon,
  boundingBox: rectangle,
  filterKeys: v.optional(
    v.record(v.string(), v.union(primitive, v.array(primitive))),
  ),
});

const polygonWithDistance = polygonResult.extend({
  distance: v.number(),
});

/**
 * Find all polygons that intersect a given shape.
 */
export const intersects = query({
  args: {
    shape: queryShape,
    maxCoveringCells: v.optional(v.number()),
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(polygonResult),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implIntersects(ctx, s2, {
      shape: args.shape,
      maxCoveringCells: args.maxCoveringCells ?? 30,
      filtering: args.filtering ?? [],
      limit: args.limit ?? 100,
      type: "polygon",
      cursor: args.cursor,
    });
  },
});

/**
 * Find all polygons that contain a given point.
 *
 * Uses S2 cell indexing to gather candidates, then applies an exact
 * point-in-polygon test against each candidate's exterior ring.
 */
export const containsPoint = query({
  args: {
    point: point,
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(polygonResult),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    const { point: queryPoint, filtering = [], limit = 100, cursor } = args;

    const cursorData = cursor ? decodeCursor(cursor) : undefined;
    const mustFilters = filtering.filter((f) => f.occur === "must");
    const shouldFilters = filtering.filter((f) => f.occur === "should");

    const pointCells = s2.pointCellsAllLevels(queryPoint);
    const pointTokens = pointCells.map((cellId) => s2.cellIDToken(cellId));

    const { candidateIds } = await gatherCandidates(ctx, pointTokens);

    const results: {
      key: string;
      type: "polygon";
      coordinates: Polygon;
      boundingBox: Rectangle;
      filterKeys?: Record<string, Primitive | Primitive[]>;
      sortKey: number;
    }[] = [];

    for (const [geometryId] of candidateIds) {
      if (results.length >= limit) {
        break;
      }

      const geometry = await ctx.db.get(geometryId);
      if (!geometry) {
        continue;
      }
      if (geometry.type !== "polygon") {
        continue;
      }
      if (!matchesFilterConditions(geometry, mustFilters, shouldFilters)) {
        continue;
      }

      if (cursorData) {
        const geoSortKey = geometry.sortKey;
        const geoKey = geometry.key;
        if (
          geoSortKey < cursorData.sortKey ||
          (geoSortKey === cursorData.sortKey && geoKey <= cursorData.secondary)
        ) {
          continue;
        }
      }

      const bbox = {
        south: geometry.south,
        north: geometry.north,
        west: geometry.west,
        east: geometry.east,
      };
      if (!boundingBoxContainsPoint(bbox, queryPoint)) {
        continue;
      }

      const poly = geometry.coordinates as Polygon;
      if (s2.polygonContainsPoint(poly.exterior, queryPoint)) {
        results.push({
          key: geometry.key,
          type: "polygon",
          coordinates: poly,
          boundingBox: bbox,
          filterKeys: geometry.filterKeys,
          sortKey: geometry.sortKey,
        });
      }
    }

    const nextCursor =
      results.length === limit
        ? encodeCursor({
            sortKey: results[results.length - 1].sortKey,
            secondary: results[results.length - 1].key,
          })
        : undefined;

    return { results, nextCursor };
  },
});

/**
 * Find polygons within a given distance of a point, sorted by distance ascending.
 */
export const nearest = query({
  args: {
    point: point,
    maxDistance: v.optional(v.number()),
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(polygonWithDistance),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implGeometriesNear(ctx, s2, {
      point: args.point,
      maxDistance: args.maxDistance,
      filtering: args.filtering ?? [],
      maxResults: args.limit ?? 100,
      type: "polygon",
      cursor: args.cursor,
    });
  },
});
