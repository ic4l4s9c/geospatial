import { mutation, query, type MutationCtx } from "./_generated/server.js";
import { v } from "convex/values";
import { S2Bindings } from "./lib/s2Bindings.js";
import {
  config,
  filterKeys,
  polygon,
  rectangle,
} from "./validators.js";
import type { Point, Polygon } from "./validators.js";
import { validatePointBounds } from "./lib/geometry/points.js";
import { computeBoundingBox } from "./lib/geometry/bbox.js";
import { polygonKey, type PolygonKey } from "./schema.js";
import { encodeCursor } from "./lib/cursor.js";
import { filterCounterKey } from "./streams/filterKeyRange.js";
import { cellCounterKey } from "./streams/cellRange.js";
import * as approximateCounter from "./lib/approximateCounter.js";
import { s2CellTokens } from "./lib/geometry/cells.js";

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
  key: polygonKey,
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
    config: config,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();

    await removePolygonByKey(ctx, args.document.key);

    const exterior = validatePolygonCoordinates(args.document.coordinates);
    validatePointBounds(exterior);
    const bbox = computeBoundingBox(exterior);

    const polygonId = await ctx.db.insert("polygons", {
      key: args.document.key,
      coordinates: args.document.coordinates,
      ...bbox,
      sortKey: args.document.sortKey,
      filterKeys: args.document.filterKeys,
    });

    const cellTokens = s2CellTokens(s2, exterior, args.config);
    const cursor = encodeCursor(args.document.sortKey, polygonId);

    for (const cell of cellTokens) {
      await ctx.db.insert("polygonCells", {
        key: args.document.key,
        cell,
        cursor,
      });
      await approximateCounter.increment(ctx, polygonId, cellCounterKey(cell));
    }

    for (const [filterKey, filterDoc] of Object.entries(
      args.document.filterKeys ?? {},
    )) {
      const valueArray = Array.isArray(filterDoc) ? filterDoc : [filterDoc];
      for (const filterValue of valueArray) {
        await ctx.db.insert("polygonFilters", {
          filterKey,
          filterValue,
          cursor,
        });
        await approximateCounter.increment(
          ctx,
          polygonId,
          filterCounterKey(filterKey, filterValue),
        );
      }
    }
  },
});

/**
 * Get a geometry by key.
 * @internal
 */
export const get = query({
  args: { key: polygonKey },
  returns: v.union(
    document.extend({
      boundingBox: rectangle,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const geometry = await ctx.db
      .query("polygons")
      .withIndex("by_key", (q) => q.eq("key", args.key))
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
    config: config,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();

    const existing = await ctx.db
      .query("polygons")
      .withIndex("by_key", (q) => q.eq("key", args.document.key))
      .first();
    if (!existing) {
      return false;
    }

    // Merge partial updates over the existing document.
    const merged = {
      key: existing.key,
      coordinates: args.document.coordinates ?? existing.coordinates,
      sortKey: args.document.sortKey ?? existing.sortKey,
      filterKeys: args.document.filterKeys ?? existing.filterKeys,
    };

    await removePolygonByKey(ctx, existing.key);

    // Reinsert with merged data, mirroring insert handler exactly.
    const points = validatePolygonCoordinates(merged.coordinates);
    validatePointBounds(points);
    const bbox = computeBoundingBox(points);

    const polygonId = await ctx.db.insert("polygons", {
      key: merged.key,
      coordinates: merged.coordinates,
      ...bbox,
      sortKey: merged.sortKey,
      filterKeys: merged.filterKeys,
    });

    const cellTokens = s2CellTokens(s2, points, args.config);
    const cursor = encodeCursor(merged.sortKey, polygonId);

    for (const cell of cellTokens) {
      await ctx.db.insert("polygonCells", {
        key: merged.key,
        cell,
        cursor,
      });
      await approximateCounter.increment(ctx, polygonId, cellCounterKey(cell));
    }

    for (const [filterKey, filterDoc] of Object.entries(
      merged.filterKeys ?? {},
    )) {
      const valueArray = Array.isArray(filterDoc) ? filterDoc : [filterDoc];
      for (const filterValue of valueArray) {
        await ctx.db.insert("polygonFilters", {
          filterKey,
          filterValue,
          cursor,
        });
        await approximateCounter.increment(
          ctx,
          polygonId,
          filterCounterKey(filterKey, filterValue),
        );
      }
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
    key: polygonKey,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    return await removePolygonByKey(ctx, args.key);
  },
});

async function removePolygonByKey(
  ctx: MutationCtx,
  key: PolygonKey,
): Promise<boolean> {
  const existing = await ctx.db
    .query("polygons")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!existing) {
    return false;
  }

  const cellRecords = await ctx.db
    .query("polygonCells")
    .withIndex("by_key", (q) => q.eq("key", key))
    .collect();

  for (const cellRecord of cellRecords) {
    await ctx.db.delete(cellRecord._id);
    await approximateCounter.decrement(
      ctx,
      existing._id,
      cellCounterKey(cellRecord.cell),
    );
  }

  const cursor = encodeCursor(existing.sortKey, existing._id);
  for (const [filterKey, filterDoc] of Object.entries(
    existing.filterKeys ?? {},
  )) {
    const valueArray = Array.isArray(filterDoc) ? filterDoc : [filterDoc];
    for (const filterValue of valueArray) {
      const existingFilterKey = await ctx.db
        .query("polygonFilters")
        .withIndex("by_filter_and_cursor", (q) =>
          q
            .eq("filterKey", filterKey)
            .eq("filterValue", filterValue)
            .eq("cursor", cursor),
        )
        .unique();
      if (!existingFilterKey) {
        throw new Error(
          `Invariant failed: Missing filterKey ${filterKey}:${filterValue} for polygon ${existing._id}`,
        );
      }
      await ctx.db.delete(existingFilterKey._id);
      await approximateCounter.decrement(
        ctx,
        existing._id,
        filterCounterKey(filterKey, filterValue),
      );
    }
  }

  await ctx.db.delete(existing._id);
  return true;
}
