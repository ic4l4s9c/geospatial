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
  equalityCondition,
} from "../validators.js";
import { createLogger, logLevel } from "../lib/logging.js";
import { S2Bindings } from "../lib/s2Bindings.js";
import { decodeCursor, encodeCursor } from "../lib/cursor.js";
import { queryNearest } from "../lib/geometry/queryNearest.js";
import { queryIntersecting } from "../lib/geometry/queryIntersecting.js";
import { gatherCandidates } from "../lib/geometry/candidates.js";
import { matchesFilterConditions } from "../lib/geometry/filterConditions.js";
import { boundingBoxContainsPoint } from "../lib/geometry/bbox.js";

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
    minLevel: v.optional(v.number()),
    maxLevel: v.optional(v.number()),
    levelMod: v.optional(v.number()),
    maxCells: v.optional(v.number()),
    logLevel,
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(polygonResult),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);
    const s2 = await S2Bindings.load();
    return queryIntersecting<"polygon">(
      ctx,
      s2,
      {
        shape: args.shape,
        minLevel: args.minLevel,
        maxLevel: args.maxLevel,
        levelMod: args.levelMod,
        maxCells: args.maxCells ?? 30,
        filtering: args.filtering ?? [],
        limit: args.limit ?? 100,
        type: "polygon",
        cursor: args.cursor,
      },
      logger,
    );
  },
});

/**
 * Find all polygons that contain a given point.
 *
 * Uses S2 cell indexing to gather candidates, then applies an exact
 * point-in-polygon test against each candidate's exterior ring.
 */
export const contains = query({
  args: {
    shape: v.union(point, polygon),
    minLevel: v.optional(v.number()),
    maxLevel: v.optional(v.number()),
    levelMod: v.optional(v.number()),
    maxCells: v.optional(v.number()),
    logLevel,
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(polygonResult),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);
    const s2 = await S2Bindings.load();
    const {
      shape,
      minLevel,
      maxLevel,
      levelMod,
      maxCells,
      filtering = [],
      limit = 100,
      cursor,
    } = args;

    const mustFilters = filtering.filter((f) => f.occur === "must");
    const shouldFilters = filtering.filter((f) => f.occur === "should");

    const isPolygon = "exterior" in shape;
    let pointCells: bigint[];
    if (isPolygon) {
      pointCells = s2.filterCellsByLevel(
        s2.coverPolygonForIndex(shape.exterior, maxCells),
        minLevel,
        maxLevel,
        levelMod,
      );
    } else {
      pointCells = s2.filterCellsByLevel(
        s2.pointCellsAllLevels(shape),
        minLevel,
        maxLevel,
        levelMod,
      );
    }

    const pointTokens = pointCells.map((cellId) => s2.cellIDToken(cellId));
    logger.debug("Contains query cell tokens", pointTokens);

    const { candidateIds } = await gatherCandidates(ctx, pointTokens);
    logger.debug(`Gathered ${candidateIds.size} candidates`);

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

      const cursorData = cursor ? decodeCursor(cursor) : undefined;
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
      if (!isPolygon && !boundingBoxContainsPoint(bbox, shape)) {
        continue;
      }

      const poly = geometry.coordinates as Polygon;
      let contains = false;
      if (isPolygon) {
        contains = s2.polygonContainsPolygon(poly.exterior, shape.exterior);
      } else {
        contains = s2.polygonContainsPoint(poly.exterior, shape);
      }
      if (contains) {
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

    logger.info(`Contains query found ${results.length} results`);

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
    minLevel: v.optional(v.number()),
    maxLevel: v.optional(v.number()),
    levelMod: v.optional(v.number()),
    maxCells: v.optional(v.number()),
    maxDistance: v.optional(v.number()),
    logLevel,
    filtering: v.optional(v.array(equalityCondition)),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  returns: v.object({
    results: v.array(polygonWithDistance),
    nextCursor: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    const logger = createLogger(args.logLevel);
    const s2 = await S2Bindings.load();
    return queryNearest<"polygon">(
      ctx,
      s2,
      {
        point: args.point,
        minLevel: args.minLevel,
        maxLevel: args.maxLevel,
        levelMod: args.levelMod,
        maxCells: args.maxCells,
        maxDistance: args.maxDistance,
        filtering: args.filtering ?? [],
        maxResults: args.limit ?? 100,
        type: "polygon",
        cursor: args.cursor,
      },
      logger,
    );
  },
});
