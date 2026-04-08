import { internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { geospatial } from "../geospatial";
import { PLACES_SEED_DATA } from "./data/places";

const DEFAULT_BATCH_SIZE = 10;

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
      const existing = await ctx.db.query("places").collect();
      await Promise.all(
        existing.map(async (doc) => {
          await geospatial.points.remove(ctx, doc._id);
          await ctx.db.delete(doc._id);
        }),
      );
    }

    const batch = PLACES_SEED_DATA.slice(offset, offset + batchSize);
    if (batch.length === 0) {
      return {
        inserted: 0,
        nextOffset: null,
        total: PLACES_SEED_DATA.length,
        remaining: 0,
      };
    }

    let inserted = 0;

    for (const place of batch) {
      const id = await ctx.db.insert("places", {
        name: place.name,
        description: place.description,
        category: place.category,
        tags: place.tags,
        rating: place.rating,
        imageUrl: place.imageUrl,
      });

      await geospatial.points.insert(
        ctx,
        id,
        place.coordinates,
        { category: place.category, tags: place.tags },
        place.rating,
      );

      inserted++;
    }

    const nextOffset = offset + batchSize;
    const hasMore = nextOffset < PLACES_SEED_DATA.length;

    return {
      inserted,
      nextOffset: hasMore ? nextOffset : null,
      total: PLACES_SEED_DATA.length,
      remaining: hasMore ? PLACES_SEED_DATA.length - nextOffset : 0,
    };
  },
});
