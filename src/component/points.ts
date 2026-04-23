import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server.js";
import { point, type Point, filterKeys, config } from "./validators.js";
import { encodeCursor } from "./lib/cursor.js";
import { filterCounterKey } from "./streams/filterKeyRange.js";
import { cellCounterKey } from "./streams/cellRange.js";
import * as approximateCounter from "./lib/approximateCounter.js";
import { S2Bindings } from "./lib/s2Bindings.js";
import { type CellIDToken, type PointKey, pointKey } from "./schema.js";

const document = v.object({
  key: pointKey,
  coordinates: point,
  sortKey: v.number(),
  filterKeys: filterKeys,
});

export const insert = mutation({
  args: {
    document: document,
    config: config,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const s2 = await S2Bindings.load();
    await removePointByKey(ctx, args.document.key);

    const pointId = await ctx.db.insert("points", args.document);
    const cellTokens = s2Cells(s2, args.document.coordinates, args.config);
    const cursor = encodeCursor(args.document.sortKey, pointId);

    for (const cell of cellTokens) {
      await ctx.db.insert("pointCells", {
        key: args.document.key,
        cell,
        cursor,
      });
      await approximateCounter.increment(ctx, pointId, cellCounterKey(cell));
    }

    for (const [filterKey, filterDoc] of Object.entries(
      args.document.filterKeys ?? {},
    )) {
      const valueArray = Array.isArray(filterDoc) ? filterDoc : [filterDoc];
      for (const filterValue of valueArray) {
        await ctx.db.insert("pointFilters", {
          filterKey,
          filterValue,
          cursor,
        });
        await approximateCounter.increment(
          ctx,
          pointId,
          filterCounterKey(filterKey, filterValue),
        );
      }
    }
  },
});

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
      .query("points")
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

    await removePointByKey(ctx, existing.key);

    // Reinsert with merged data, mirroring insert handler exactly.
    const pointId = await ctx.db.insert("points", merged);
    const cellTokens = s2Cells(s2, merged.coordinates, args.config);
    const cursor = encodeCursor(merged.sortKey, pointId);

    for (const cell of cellTokens) {
      await ctx.db.insert("pointCells", {
        key: merged.key,
        cell,
        cursor,
      });
      await approximateCounter.increment(ctx, pointId, cellCounterKey(cell));
    }

    for (const [filterKey, filterDoc] of Object.entries(
      merged.filterKeys ?? {},
    )) {
      const valueArray = Array.isArray(filterDoc) ? filterDoc : [filterDoc];
      for (const filterValue of valueArray) {
        await ctx.db.insert("pointFilters", {
          filterKey,
          filterValue,
          cursor,
        });
        await approximateCounter.increment(
          ctx,
          pointId,
          filterCounterKey(filterKey, filterValue),
        );
      }
    }

    return true;
  },
});

export const get = query({
  args: {
    key: pointKey,
  },
  returns: v.union(document, v.null()),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("points")
      .withIndex("by_key", (q) => q.eq("key", args.key))
      .first();
    if (!result) {
      return null;
    }
    const { _id, _creationTime, ...document } = result;
    return document;
  },
});

export const del = mutation({
  args: {
    key: pointKey,
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    return await removePointByKey(ctx, args.key);
  },
});

async function removePointByKey(
  ctx: MutationCtx,
  key: PointKey,
): Promise<boolean> {
  const existing = await ctx.db
    .query("points")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!existing) {
    return false;
  }

  const cellRecords = await ctx.db
    .query("pointCells")
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
        .query("pointFilters")
        .withIndex("by_filter_and_cursor", (q) =>
          q
            .eq("filterKey", filterKey)
            .eq("filterValue", filterValue)
            .eq("cursor", cursor),
        )
        .unique();
      if (!existingFilterKey) {
        throw new Error(
          `Invariant failed: Missing filterKey ${filterKey}:${filterValue} for point ${existing._id}`,
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

function s2Cells(
  s2: S2Bindings,
  point: Point,
  opts: {
    minLevel: number;
    maxLevel: number;
    levelMod: number;
    maxCells: number;
  },
): CellIDToken[] {
  const leafCellID = s2.cellIDFromPoint(point);
  const cells: CellIDToken[] = [];
  for (let i = opts.minLevel; i <= opts.maxLevel; i += opts.levelMod) {
    const parentCellID = s2.cellIDParent(leafCellID, i);
    cells.push(s2.cellIDToken(parentCellID));
  }
  return cells;
}
