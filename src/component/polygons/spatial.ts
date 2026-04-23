import { v } from "convex/values";
import { query, type QueryCtx } from "../_generated/server.js";
import {
  queryShape,
  filterCondition,
  rectangle,
  polygon,
  point,
  config,
  type FilterCondition,
} from "../validators.js";
import { createLogger, logLevel } from "../lib/logging.js";
import { S2Bindings } from "../lib/s2Bindings.js";
import { decodeCursor, encodeCursor } from "../lib/cursor.js";
import {
  boundingBoxContainsPoint,
  boundingBoxesIntersect,
  boundingBoxContainsPolygon,
} from "../lib/geometry/bbox.js";
import { paginationResultValidator } from "convex/server";
import type { Doc } from "../_generated/dataModel.js";
import type { CellIDToken, PolygonKey } from "../schema.js";

const polygonDoc = v.object({
  key: v.string(),
  coordinates: polygon,
  boundingBox: rectangle,
  sortKey: v.number(),
});

const polygonDocWithDistance = polygonDoc.extend({
  distance: v.number(),
});

async function gatherCandidates(
  ctx: QueryCtx,
  cellTokens: CellIDToken[],
): Promise<Map<PolygonKey, Doc<"polygons">>> {
  const map = new Map<PolygonKey, Doc<"polygons">>();
  for (const token of cellTokens) {
    const cells = await ctx.db
      .query("polygonCells")
      .withIndex("by_cell_and_cursor", (q) =>
        q.gte("cell", token).lt("cell", (token + "~") as CellIDToken),
      )
      .collect();
    for (const cell of cells) {
      if (!map.has(cell.key)) {
        const geometry = await ctx.db
          .query("polygons")
          .withIndex("by_key", (q) => q.eq("key", cell.key))
          .first();
        if (geometry) {
          map.set(cell.key, geometry);
        }
      }
    }
  }
  return map;
}

function matchesFilters(
  geometry: Doc<"polygons">,
  mustFilters: FilterCondition[],
  shouldFilters: FilterCondition[],
): boolean {
  for (const f of mustFilters) {
    const value = geometry.filterKeys?.[f.filterKey];
    if (value !== f.filterValue) {
      return false;
    }
  }
  if (shouldFilters.length > 0) {
    return shouldFilters.some(
      (f) => geometry.filterKeys?.[f.filterKey] === f.filterValue,
    );
  }
  return true;
}

export const intersects = query({
  args: {
    config: config,
    query: v.object({
      shape: queryShape,
      filtering: v.optional(v.array(filterCondition)),
      limit: v.number(),
    }),
    cursor: v.optional(v.string()),
    logLevel: v.optional(logLevel),
  },
  returns: paginationResultValidator(polygonDoc),
  handler: async (ctx, args) => {
    const {
      config,
      query: { limit = 100, filtering = [], shape },
      cursor,
      logLevel,
    } = args;

    const logger = createLogger(logLevel);
    logger.time("polygons.intersects");
    const s2 = await S2Bindings.load();

    const mustFilters = filtering.filter((f) => f.occur === "must");
    const shouldFilters = filtering.filter((f) => f.occur === "should");

    let cellTokens: CellIDToken[] = [];
    if (shape.type === "rectangle") {
      cellTokens = s2
        .coverRectangle(
          shape.rectangle,
          config.minLevel,
          config.maxLevel,
          config.levelMod,
          config.maxCells,
        )
        .map((c) => s2.cellIDToken(c));
    } else if (shape.type === "polygon") {
      cellTokens = s2
        .coverPolygon(
          shape.polygon.exterior,
          config.minLevel,
          config.maxLevel,
          config.levelMod,
          config.maxCells,
        )
        .map((c) => s2.cellIDToken(c));
    } else if (shape.type === "point") {
      const pointCells = s2.pointCellsAllLevels(shape.point);
      cellTokens = pointCells.map((c) => s2.cellIDToken(c));
    }

    const candidates = await gatherCandidates(ctx, cellTokens);
    const cursorData = cursor ? decodeCursor(cursor) : undefined;
    const page = [];
    let lastInfo: { sortKey: number; key: string } | null = null;

    for (const [_key, geometry] of candidates) {
      if (!matchesFilters(geometry, mustFilters, shouldFilters)) {
        continue;
      }

      if (
        cursorData &&
        (geometry.sortKey < cursorData.sortKey ||
          (geometry.sortKey === cursorData.sortKey &&
            geometry.key <= cursorData.id))
      ) {
        continue;
      }

      const bbox = {
        south: geometry.south,
        north: geometry.north,
        west: geometry.west,
        east: geometry.east,
      };

      let intersects = false;
      if (shape.type === "rectangle") {
        intersects = boundingBoxesIntersect(bbox, shape.rectangle);
      } else if (shape.type === "polygon") {
        if (!boundingBoxContainsPolygon(bbox, shape.polygon)) {
          continue;
        }
        intersects = s2.polygonIntersectsPolygon(
          geometry.coordinates.exterior,
          shape.polygon.exterior,
        );
      } else {
        intersects = boundingBoxContainsPoint(bbox, shape.point);
      }

      if (intersects) {
        page.push({
          key: geometry.key,
          coordinates: geometry.coordinates,
          boundingBox: bbox,
          sortKey: geometry.sortKey,
        });
        if (
          !lastInfo ||
          geometry.sortKey > lastInfo.sortKey ||
          (geometry.sortKey === lastInfo.sortKey && geometry.key > lastInfo.key)
        ) {
          lastInfo = { sortKey: geometry.sortKey, key: geometry.key };
        }
      }
      if (page.length >= limit) {
        break;
      }
    }

    page.sort((a, b) => a.sortKey - b.sortKey || a.key.localeCompare(b.key));
    const continueCursor =
      page.length === limit && lastInfo
        ? encodeCursor(lastInfo.sortKey, lastInfo.key)
        : "";

    logger.timeEnd("polygons.intersects");
    return { page, continueCursor, isDone: continueCursor === "" };
  },
});

export const contains = query({
  args: {
    config: config,
    query: v.object({
      shape: queryShape,
      filtering: v.optional(v.array(filterCondition)),
      limit: v.number(),
    }),
    cursor: v.optional(v.string()),
    logLevel: v.optional(logLevel),
  },
  returns: paginationResultValidator(polygonDoc),
  handler: async (ctx, args) => {
    const {
      config,
      query: { limit = 100, filtering = [], shape },
      cursor,
      logLevel,
    } = args;

    const logger = createLogger(logLevel);
    logger.time("polygons.contains");
    const s2 = await S2Bindings.load();

    const mustFilters = filtering.filter((f) => f.occur === "must");
    const shouldFilters = filtering.filter((f) => f.occur === "should");

    let cellTokens: CellIDToken[];
    if (shape.type === "polygon") {
      cellTokens = s2
        .coverPolygon(
          shape.polygon.exterior,
          config.minLevel,
          config.maxLevel,
          config.levelMod,
          config.maxCells,
        )
        .map((c) => s2.cellIDToken(c));
    } else if (shape.type === "point") {
      const pointCells = s2.pointCellsAllLevels(shape.point);
      cellTokens = pointCells.map((c) => s2.cellIDToken(c));
    } else {
      cellTokens = [];
    }

    const candidates = await gatherCandidates(ctx, cellTokens);
    const cursorData = cursor ? decodeCursor(cursor) : undefined;
    const page = [];
    let lastInfo: { sortKey: number; key: string } | null = null;

    for (const [_key, geometry] of candidates) {
      if (!matchesFilters(geometry, mustFilters, shouldFilters)) {
        continue;
      }

      if (
        cursorData &&
        (geometry.sortKey < cursorData.sortKey ||
          (geometry.sortKey === cursorData.sortKey &&
            geometry.key <= cursorData.id))
      ) {
        continue;
      }

      const bbox = {
        south: geometry.south,
        north: geometry.north,
        west: geometry.west,
        east: geometry.east,
      };

      switch (shape.type) {
        case "point": {
          if (!boundingBoxContainsPoint(bbox, shape.point)) {
            continue;
          }
          break;
        }
        case "polygon": {
          if (!boundingBoxContainsPolygon(bbox, shape.polygon)) {
            continue;
          }
          break;
        }
        case "rectangle": {
          if (!boundingBoxesIntersect(bbox, shape.rectangle)) {
            continue;
          }
          break;
        }
      }

      let contains = false;
      if (shape.type === "polygon") {
        contains = s2.polygonContainsPolygon(
          shape.polygon.exterior,
          geometry.coordinates.exterior,
        );
      } else if (shape.type === "point") {
        contains = s2.polygonContainsPoint(
          geometry.coordinates.exterior,
          shape.point,
        );
      }

      if (contains) {
        page.push({
          key: geometry.key,
          coordinates: geometry.coordinates,
          boundingBox: bbox,
          sortKey: geometry.sortKey,
        });
        if (
          !lastInfo ||
          geometry.sortKey > lastInfo.sortKey ||
          (geometry.sortKey === lastInfo.sortKey && geometry.key > lastInfo.key)
        ) {
          lastInfo = { sortKey: geometry.sortKey, key: geometry.key };
        }
      }
      if (page.length >= limit) {
        break;
      }
    }

    page.sort((a, b) => a.sortKey - b.sortKey || a.key.localeCompare(b.key));

    const continueCursor =
      page.length === limit && lastInfo
        ? encodeCursor(lastInfo.sortKey, lastInfo.key)
        : "";

    logger.timeEnd("polygons.contains");
    return { page, continueCursor, isDone: continueCursor === "" };
  },
});

export const nearest = query({
  args: {
    config: config,
    query: v.object({
      point: point,
      maxDistance: v.optional(v.number()),
      filtering: v.optional(v.array(filterCondition)),
      limit: v.number(),
    }),
    cursor: v.optional(v.string()),
    logLevel: v.optional(logLevel),
  },
  returns: paginationResultValidator(polygonDocWithDistance),
  handler: async (ctx, args) => {
    const {
      config,
      query: { limit = 100, filtering = [], maxDistance, point },
      cursor,
      logLevel,
    } = args;

    const logger = createLogger(logLevel);
    logger.time("polygons.nearest");
    const s2 = await S2Bindings.load();

    const mustFilters = filtering.filter((f) => f.occur === "must");
    const shouldFilters = filtering.filter((f) => f.occur === "should");

    let cellTokens: CellIDToken[];
    if (maxDistance !== undefined) {
      const METERS_PER_DEGREE = 111000;
      const latDelta = maxDistance / METERS_PER_DEGREE;
      const cosLat = Math.max(0.01, Math.cos((point.latitude * Math.PI) / 180));
      const lngDelta = Math.min(
        maxDistance / (METERS_PER_DEGREE * cosLat),
        180,
      );

      const searchBbox = {
        south: Math.max(-90, point.latitude - latDelta),
        north: Math.min(90, point.latitude + latDelta),
        west: Math.max(-180, point.longitude - lngDelta),
        east: Math.min(180, point.longitude + lngDelta),
      };

      cellTokens = s2
        .coverRectangle(
          searchBbox,
          config.minLevel,
          config.maxLevel,
          config.levelMod,
          config.maxCells,
        )
        .map((c) => s2.cellIDToken(c));
    } else {
      cellTokens = s2
        .filterCellsByLevel(
          s2.pointCellsAllLevels(point),
          config.minLevel,
          config.maxLevel,
          config.levelMod,
        )
        .map((c) => s2.cellIDToken(c));
    }

    const candidates = await gatherCandidates(ctx, cellTokens);
    const cursorData = cursor ? decodeCursor(cursor) : undefined;
    const page = [];

    for (const [_key, geometry] of candidates) {
      if (!matchesFilters(geometry, mustFilters, shouldFilters)) {
        continue;
      }

      if (
        cursorData &&
        (geometry.sortKey < cursorData.sortKey ||
          (geometry.sortKey === cursorData.sortKey &&
            geometry.key <= cursorData.id))
      ) {
        continue;
      }

      const distance = s2.chordAngleToMeters(
        s2.distanceToPolygonEdge(geometry.coordinates.exterior, point),
      );

      if (maxDistance !== undefined && distance > maxDistance) {
        continue;
      }

      page.push({
        key: geometry.key,
        coordinates: geometry.coordinates,
        boundingBox: {
          south: geometry.south,
          north: geometry.north,
          west: geometry.west,
          east: geometry.east,
        },
        sortKey: geometry.sortKey,
        distance,
      });
      if (page.length >= limit) {
        break;
      }
    }

    page.sort((a, b) => a.distance - b.distance || a.key.localeCompare(b.key));

    const continueCursor =
      page.length === limit
        ? encodeCursor(page[page.length - 1].sortKey, page[page.length - 1].key)
        : "";

    logger.timeEnd("polygons.nearest");
    return { page, continueCursor, isDone: continueCursor === "" };
  },
});
