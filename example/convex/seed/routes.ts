import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { geospatial } from "../geospatial";
import { ROUTES_SEED_DATA } from "./data/routes";

const DEFAULT_BATCH_SIZE = 5;

export const seed = internalMutation({
  args: {
    batchSize: v.optional(v.number()),
    offset: v.optional(v.number()),
    clearExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? DEFAULT_BATCH_SIZE;
    const offset = args.offset ?? 0;

    if (args.clearExisting && offset === 0) {
      const existing = await ctx.db.query("routes").collect();
      await Promise.all(
        existing.map(async (doc) => {
          await geospatial.polylines.remove(ctx, doc._id);
          await ctx.db.delete(doc._id);
        }),
      );
    }

    const batch = ROUTES_SEED_DATA.slice(offset, offset + batchSize);
    if (batch.length === 0) {
      return {
        inserted: 0,
        nextOffset: null,
        total: ROUTES_SEED_DATA.length,
        remaining: 0,
      };
    }

    let inserted = 0;

    for (const route of batch) {
      const id = await ctx.db.insert("routes", {
        name: route.name,
        description: route.description,
        mode: route.mode,
        tags: route.tags,
        durationMinutes: route.durationMinutes,
      });

      await geospatial.polylines.insert(ctx, id, route.coordinates, {
        mode: route.mode,
        tags: route.tags,
      });

      inserted++;
    }

    const nextOffset = offset + batchSize;
    const hasMore = nextOffset < ROUTES_SEED_DATA.length;

    return {
      inserted,
      nextOffset: hasMore ? nextOffset : null,
      total: ROUTES_SEED_DATA.length,
      remaining: hasMore ? ROUTES_SEED_DATA.length - nextOffset : 0,
    };
  },
});
