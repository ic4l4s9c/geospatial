import { v } from "convex/values";
import { query } from "../_generated/server.js";
import {
  type Polygon,
  polygon,
  type Primitive,
  primitive,
  type Rectangle,
  rectangle,
} from "../validators.js";
import { S2Bindings } from "../lib/s2Bindings.js";
import {
  boundingBoxContainsPoint,
  gatherCandidates,
  implGeometriesNear,
  implIntersects,
  implList,
  matchesFilterKeys,
} from "../lib/geometryQuery.js";

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
 * List stored polygons.
 */
export const list = query({
  args: {
    limit: v.optional(v.number()),
  },
  returns: v.array(polygonResult),
  handler: async (ctx, args) => {
    return implList(ctx, { limit: args.limit ?? 100, type: "polygon" });
  },
});

/**
 * Find all polygons that intersect a given shape.
 */
export const intersects = query({
  args: {
    shape: v.union(
      v.object({ type: v.literal("rectangle"), rectangle }),
      v.object({ type: v.literal("polygon"), polygon }),
    ),
    maxCoveringCells: v.optional(v.number()),
    filterKeys: v.optional(
      v.record(v.string(), v.union(primitive, v.array(primitive))),
    ),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    results: v.array(polygonResult),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implIntersects(ctx, s2, {
      shape: args.shape,
      maxCoveringCells: args.maxCoveringCells ?? 30,
      filterKeys: args.filterKeys,
      limit: args.limit ?? 100,
      type: "polygon",
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
    point: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    filterKeys: v.optional(v.record(v.string(), v.union(primitive, v.array(primitive)))),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    results: v.array(polygonResult),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    const { point: queryPoint, filterKeys, limit = 100 } = args;

    // Get all S2 cells at every level that contain this point, then look up
    // which stored geometries index those cells. Any polygon containing the
    // point must index at least one of these cells.
    const pointCells = s2.pointCellsAllLevels(queryPoint);
    const pointTokens = pointCells.map((cellId) => s2.cellIDToken(cellId));

    const { candidateIds, truncated } = await gatherCandidates(
      ctx,
      pointTokens,
    );

    const results: {
      key: string;
      type: "polygon";
      coordinates: Polygon;
      boundingBox: Rectangle;
      filterKeys?: Record<string, Primitive | Primitive[]>;
    }[] = [];

    for (const [geometryId] of candidateIds) {
      if (results.length >= limit) break;

      const geometry = await ctx.db.get(geometryId);
      if (!geometry) {
        continue;
      }
      if (geometry.type !== "polygon") {
        continue;
      }
      if (!matchesFilterKeys(geometry, filterKeys)) {
        continue;
      }

      // Cheap bounding box rejection before the exact S2 test.
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
        });
      }
    }

    return { results, truncated };
  },
});

/**
 * Find polygons within a given distance of a point, sorted by distance ascending.
 */
export const near = query({
  args: {
    point: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    maxDistance: v.number(),
    filterKeys: v.optional(v.record(v.string(), v.union(primitive, v.array(primitive)))),
    limit: v.optional(v.number()),
  },
  returns: v.object({
    results: v.array(polygonWithDistance),
    truncated: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    return implGeometriesNear(ctx, s2, {
      point: args.point,
      maxDistance: args.maxDistance,
      filterKeys: args.filterKeys,
      limit: args.limit ?? 100,
      type: "polygon",
    });
  },
});
