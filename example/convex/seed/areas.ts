import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { geospatial } from "../geospatial";
import { AREAS_SEED_DATA } from "./data/areas";

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
      const existing = await ctx.db.query("areas").collect();
      await Promise.all(
        existing.map(async (doc) => {
          await geospatial.polygons.remove(ctx, doc._id);
          await ctx.db.delete(doc._id);
        }),
      );
    }

    const batch = AREAS_SEED_DATA.slice(offset, offset + batchSize);
    if (batch.length === 0) {
      return {
        inserted: 0,
        nextOffset: null,
        total: AREAS_SEED_DATA.length,
        remaining: 0,
      };
    }

    let inserted = 0;

    for (const area of batch) {
      const id = await ctx.db.insert("areas", {
        name: area.name,
        description: area.description,
        type: area.type,
        tags: area.tags,
        color: area.color,
      });

      await geospatial.polygons.insert(
        ctx,
        id,
        {
          exterior: area.coordinates,
        },
        {
          type: area.type,
          tags: area.tags,
        },
      );

      inserted++;
    }

    const nextOffset = offset + batchSize;
    const hasMore = nextOffset < AREAS_SEED_DATA.length;

    return {
      inserted,
      nextOffset: hasMore ? nextOffset : null,
      total: AREAS_SEED_DATA.length,
      remaining: hasMore ? AREAS_SEED_DATA.length - nextOffset : 0,
    };
  },
});
