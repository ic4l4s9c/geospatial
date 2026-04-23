import { mutation, query, type MutationCtx } from "./_generated/server.js";
import { v } from "convex/values";
import { S2Bindings } from "./lib/s2Bindings.js";
import { config, filterKeys, polyline, rectangle } from "./validators.js";
import type { Point } from "./validators.js";
import { validatePointBounds } from "./lib/geometry/points.js";
import { computeBoundingBox } from "./lib/geometry/bbox.js";
import { polylineKey, type PolylineKey } from "./schema.js";
import { encodeCursor } from "./lib/cursor.js";
import { filterCounterKey } from "./streams/filterKeyRange.js";
import { cellCounterKey } from "./streams/cellRange.js";
import * as approximateCounter from "./lib/approximateCounter.js";
import { s2CellTokens } from "./lib/geometry/cells.js";

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
  key: polylineKey,
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
    config: config,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();

    await removePolylineByKey(ctx, args.document.key);

    const points = validatePolyline(args.document.coordinates);
    validatePointBounds(points);
    const bbox = computeBoundingBox(points);

    const polylineId = await ctx.db.insert("polylines", {
      key: args.document.key,
      coordinates: args.document.coordinates,
      ...bbox,
      sortKey: args.document.sortKey,
      filterKeys: args.document.filterKeys,
    });

    const cellTokens = s2CellTokens(s2, points, args.config);
    const cursor = encodeCursor(args.document.sortKey, polylineId);

    for (const cell of cellTokens) {
      await ctx.db.insert("polylineCells", {
        key: args.document.key,
        cell,
        cursor,
      });
      await approximateCounter.increment(ctx, polylineId, cellCounterKey(cell));
    }

    for (const [filterKey, filterDoc] of Object.entries(
      args.document.filterKeys ?? {},
    )) {
      const valueArray = Array.isArray(filterDoc) ? filterDoc : [filterDoc];
      for (const filterValue of valueArray) {
        await ctx.db.insert("polylineFilters", {
          filterKey,
          filterValue,
          cursor,
        });
        await approximateCounter.increment(
          ctx,
          polylineId,
          filterCounterKey(filterKey, filterValue),
        );
      }
    }
  },
});

/**
 * Get a polyline by key.
 * @internal
 */
export const get = query({
  args: { key: polylineKey },
  returns: v.union(
    document.extend({
      boundingBox: rectangle,
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const geometry = await ctx.db
      .query("polylines")
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
 * Update a polyline's coordinates or metadata.
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
      .query("polylines")
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

    await removePolylineByKey(ctx, existing.key);

    // Reinsert with merged data, mirroring insert handler exactly.
    const points = validatePolyline(merged.coordinates);
    validatePointBounds(points);
    const bbox = computeBoundingBox(points);

    const polylineId = await ctx.db.insert("polylines", {
      key: merged.key,
      coordinates: merged.coordinates,
      ...bbox,
      sortKey: merged.sortKey,
      filterKeys: merged.filterKeys,
    });

    const cellTokens = s2CellTokens(s2, points, args.config);
    const cursor = encodeCursor(merged.sortKey, polylineId);

    for (const cell of cellTokens) {
      await ctx.db.insert("polylineCells", {
        key: merged.key,
        cell,
        cursor,
      });
      await approximateCounter.increment(ctx, polylineId, cellCounterKey(cell));
    }

    for (const [filterKey, filterDoc] of Object.entries(
      merged.filterKeys ?? {},
    )) {
      const valueArray = Array.isArray(filterDoc) ? filterDoc : [filterDoc];
      for (const filterValue of valueArray) {
        await ctx.db.insert("polylineFilters", {
          filterKey,
          filterValue,
          cursor,
        });
        await approximateCounter.increment(
          ctx,
          polylineId,
          filterCounterKey(filterKey, filterValue),
        );
      }
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
    key: polylineKey,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    return await removePolylineByKey(ctx, args.key);
  },
});

async function removePolylineByKey(
  ctx: MutationCtx,
  key: PolylineKey,
): Promise<boolean> {
  const existing = await ctx.db
    .query("polylines")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!existing) {
    return false;
  }

  const cellRecords = await ctx.db
    .query("polylineCells")
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
        .query("polylineFilters")
        .withIndex("by_filter_and_cursor", (q) =>
          q
            .eq("filterKey", filterKey)
            .eq("filterValue", filterValue)
            .eq("cursor", cursor),
        )
        .unique();
      if (!existingFilterKey) {
        throw new Error(
          `Invariant failed: Missing filterKey ${filterKey}:${filterValue} for polyline ${existing._id}`,
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
