import { mutation, query } from "./_generated/server.js";
import { v } from "convex/values";
import { S2Bindings } from "./lib/s2Bindings.js";
import { config, filterKeys, polyline, rectangle } from "./validators.js";
import type { Point } from "./validators.js";
import { validatePointBounds } from "./lib/geometry/points.js";
import { computeBoundingBox } from "./lib/geometry/bbox.js";

export function validatePolyline(coordinates: unknown): Point[] {
  const line = coordinates as Point[];
  if (!Array.isArray(line)) {
    throw new Error("Invalid polyline: coordinates must be an array");
  }
  if (line.length < 2) {
    throw new Error("Polyline must have at least 2 points");
  }
  return line;
}

const document = v.object({
  key: v.string(),
  coordinates: polyline,
  filterKeys: filterKeys,
  sortKey: v.number(),
});

/**
 * Insert a polyline into the spatial index.
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

    const config = args.config ?? {
      minLevel: 4,
      maxLevel: 16,
      levelMod: 2,
      maxCells: 30,
    };
    const maxCells = config.maxCells;
    const minLevel = config.minLevel;
    const maxLevel = config.maxLevel;
    const levelMod = config.levelMod;

    const existing = await ctx.db
      .query("polylines")
      .withIndex("byKey", (q) => q.eq("key", args.document.key))
      .first();
    if (existing) {
      throw new Error(
        `Polyline with key "${args.document.key}" already exists`,
      );
    }

    const points = validatePolyline(args.document.coordinates);
    validatePointBounds(points);
    const bbox = computeBoundingBox(points);

    const polylineCells = s2.coverPolylineForIndex(points, maxCells);
    const coveringCells = polylineCells;

    const geometryId = await ctx.db.insert("polylines", {
      key: args.document.key,
      coordinates: args.document.coordinates,
      ...bbox,
      sortKey: args.document.sortKey,
      filterKeys: args.document.filterKeys,
    });

    for (const cellId of coveringCells) {
      const token = s2.cellIDToken(cellId);
      const level = s2.cellIDLevel(cellId);
      await ctx.db.insert("polylineCells", {
        geometryId,
        geometryKey: args.document.key,
        cellToken: token,
        level,
      });
    }
  },
});

/**
 * Get a polyline by key.
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
      .query("polylines")
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
 * Update a polyline's coordinates or metadata.
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
      .query("polylines")
      .withIndex("byKey", (q) => q.eq("key", args.document.key))
      .first();
    if (!existing) {
      return false;
    }

    if (args.document.coordinates !== undefined) {
      const oldCells = await ctx.db
        .query("polylineCells")
        .withIndex("byGeometryKey", (q) =>
          q.eq("geometryKey", args.document.key),
        )
        .collect();
      for (const cell of oldCells) {
        await ctx.db.delete(cell._id);
      }

      const points = validatePolyline(args.document.coordinates);
      validatePointBounds(points);
      const bbox = computeBoundingBox(points);

      const coveringCells = s2.filterCellsByLevel(
        s2.coverPolylineForIndex(points, maxCells),
        minLevel,
        maxLevel,
        levelMod,
      );

      for (const cellId of coveringCells) {
        const token = s2.cellIDToken(cellId);
        const level = s2.cellIDLevel(cellId);
        await ctx.db.insert("polylineCells", {
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
 * Remove a polyline from the spatial index.
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
      .query("polylines")
      .withIndex("byKey", (q) => q.eq("key", args.key))
      .first();
    if (!geometry) {
      return false;
    }
    await ctx.db.delete(geometry._id);

    const cells = await ctx.db
      .query("polylineCells")
      .withIndex("byGeometryKey", (q) => q.eq("geometryKey", args.key))
      .collect();
    for (const cell of cells) {
      await ctx.db.delete(cell._id);
    }
    return true;
  },
});
