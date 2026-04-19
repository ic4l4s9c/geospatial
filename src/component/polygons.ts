import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import { S2Bindings } from "./lib/s2Bindings.js";
import { config, filterKeys, polygon, rectangle } from "./validators.js";
import type { Point, Polygon } from "./validators.js";
import { validatePointBounds } from "./lib/geometry/points.js";
import { computeBoundingBox } from "./lib/geometry/bbox.js";

export function validatePolygonCoordinates(coordinates: unknown): Point[] {
  const poly = coordinates as Polygon & {
    holes?: unknown;
    interiors?: unknown;
    interior?: unknown;
  };
  if (!poly?.exterior || !Array.isArray(poly.exterior)) {
    throw new Error("Invalid polygon: missing 'exterior' array");
  }
  if (poly.exterior.length < 3) {
    throw new Error("Polygon must have at least 3 exterior points");
  }
  // Reject polygons with holes until holes are supported
  if (
    (poly.holes && Array.isArray(poly.holes) && poly.holes.length > 0) ||
    (poly.interiors &&
      Array.isArray(poly.interiors) &&
      poly.interiors.length > 0) ||
    (poly.interior && Array.isArray(poly.interior) && poly.interior.length > 0)
  ) {
    throw new Error("Polygon holes are not supported");
  }
  return poly.exterior;
}

const document = v.object({
  key: v.string(),
  coordinates: polygon,
  filterKeys: filterKeys,
  sortKey: v.number(),
});

/**
 * Insert a polygon into the spatial index.
 * @internal
 */
export const insert = mutation({
  args: {
    document: document,
    config: v.optional(config),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();

    const maxCells = args.config?.maxCells;
    const minLevel = args.config?.minLevel;
    const maxLevel = args.config?.maxLevel;
    const levelMod = args.config?.levelMod;

    const existing = await ctx.db
      .query("polygons")
      .withIndex("byKey", (q) => q.eq("key", args.document.key))
      .first();
    if (existing) {
      throw new Error(`Polygon with key "${args.document.key}" already exists`);
    }

    const points = validatePolygonCoordinates(args.document.coordinates);
    validatePointBounds(points);
    const bbox = computeBoundingBox(points);

    const polygonCells = s2.coverPolygonForIndex(points, maxCells);
    const coveringCells = s2.filterCellsByLevel(
      polygonCells,
      minLevel,
      maxLevel,
      levelMod,
    );

    const geometryId = await ctx.db.insert("polygons", {
      key: args.document.key,
      coordinates: args.document.coordinates,
      ...bbox,
      sortKey: args.document.sortKey,
      filterKeys: args.document.filterKeys,
    });

    for (const cellId of coveringCells) {
      const token = s2.cellIDToken(cellId);
      const level = s2.cellIDLevel(cellId);
      await ctx.db.insert("polygonCells", {
        geometryId,
        geometryKey: args.document.key,
        cellToken: token,
        level,
      });
    }
  },
});

/**
 * Get a geometry by key.
 * @internal
 */
export const get = query({
  args: { key: v.string() },
  returns: v.union(
    document.extend({
      boundingBox: rectangle,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const geometry = await ctx.db
      .query("polygons")
      .withIndex("byKey", (q) => q.eq("key", args.key))
      .first();

    if (!geometry) {
      return null;
    }

    return {
      key: geometry.key,
      coordinates: geometry.coordinates,
      boundingBox: {
        south: geometry.south,
        north: geometry.north,
        west: geometry.west,
        east: geometry.east,
      },
      sortKey: geometry.sortKey,
      filterKeys: geometry.filterKeys,
    };
  },
});

/**
 * Update a polygon's coordinates or metadata.
 * @internal
 */
export const update = mutation({
  args: {
    document: document.omit("key").partial().extend({
      key: document.fields.key,
    }),
    config: v.optional(config),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();

    const maxCells = args.config?.maxCells;
    const minLevel = args.config?.minLevel;
    const maxLevel = args.config?.maxLevel;
    const levelMod = args.config?.levelMod;

    const existing = await ctx.db
      .query("polygons")
      .withIndex("byKey", (q) => q.eq("key", args.document.key))
      .first();
    if (!existing) {
      return false;
    }

    if (args.document.coordinates !== undefined) {
      const oldCells = await ctx.db
        .query("polygonCells")
        .withIndex("byGeometryKey", (q) =>
          q.eq("geometryKey", args.document.key),
        )
        .collect();
      for (const cell of oldCells) {
        await ctx.db.delete(cell._id);
      }

      const points = validatePolygonCoordinates(args.document.coordinates);
      validatePointBounds(points);
      const bbox = computeBoundingBox(points);

      const coveringCells = s2.filterCellsByLevel(
        s2.coverPolygonForIndex(points, maxCells),
        minLevel,
        maxLevel,
        levelMod,
      );

      for (const cellId of coveringCells) {
        const token = s2.cellIDToken(cellId);
        const level = s2.cellIDLevel(cellId);
        await ctx.db.insert("polygonCells", {
          geometryId: existing._id,
          geometryKey: args.document.key,
          cellToken: token,
          level,
        });
      }

      await ctx.db.patch(existing._id, {
        coordinates: args.document.coordinates,
        ...bbox,
        ...(args.document.filterKeys !== undefined && {
          filterKeys: args.document.filterKeys,
        }),
        ...(args.document.sortKey !== undefined && {
          sortKey: args.document.sortKey,
        }),
      });
    } else {
      await ctx.db.patch(existing._id, {
        ...(args.document.filterKeys !== undefined && {
          filterKeys: args.document.filterKeys,
        }),
        ...(args.document.sortKey !== undefined && {
          sortKey: args.document.sortKey,
        }),
      });
    }
    return true;
  },
});

/**
 * Remove a polygon from the spatial index.
 * @internal
 */
export const del = mutation({
  args: {
    key: v.string(),
    config: v.optional(config),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const geometry = await ctx.db
      .query("polygons")
      .withIndex("byKey", (q) => q.eq("key", args.key))
      .first();
    if (!geometry) {
      return false;
    }
    await ctx.db.delete(geometry._id);

    const cells = await ctx.db
      .query("polygonCells")
      .withIndex("byGeometryKey", (q) => q.eq("geometryKey", args.key))
      .collect();
    for (const cell of cells) {
      await ctx.db.delete(cell._id);
    }
    return true;
  },
});
