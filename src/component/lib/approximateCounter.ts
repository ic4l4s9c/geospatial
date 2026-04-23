import type { Id, TableNames } from "../_generated/dataModel.js";
import type { MutationCtx, QueryCtx } from "../_generated/server.js";
import { xxHash32 } from "./xxHash32.js";
import type { CounterKey } from "../schema.js";

// We assume that (_id, key) is globally unique, so we can implement a probabilistic counter
// by incrementing and decrementing whenever `hash(_id + key) % SAMPLING_RATE == 0`. This has
// a few nice properties:
// - We uniformly sample across the increments/decrements of each key, not the keys themselves.
//   So, many concurrent increments and decrements to the same key won't contend.
// - The counter never goes negative, since we use a deterministic hash.

export const SAMPLING_RATE = 1024;

export async function increment<T extends TableNames>(
  ctx: MutationCtx,
  id: Id<T>,
  key: CounterKey,
) {
  if (xxHash32(id + key) % SAMPLING_RATE !== 0) {
    return;
  }
  const existing = await ctx.db
    .query("approximateCounters")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { count: existing.count + 1 });
  } else {
    await ctx.db.insert("approximateCounters", { key, count: 1 });
  }
}

export async function decrement<T extends TableNames>(
  ctx: MutationCtx,
  id: Id<T>,
  key: CounterKey,
) {
  if (xxHash32(id + key) % SAMPLING_RATE !== 0) {
    return;
  }
  const existing = await ctx.db
    .query("approximateCounters")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  if (!existing || existing.count === 0) {
    throw new Error(`Invariant failed: Missing counter for key ${key}`);
  }
  if (existing.count === 1) {
    await ctx.db.delete(existing._id);
  } else {
    await ctx.db.patch(existing._id, { count: existing.count - 1 });
  }
}

export async function estimateCount(ctx: QueryCtx, key: CounterKey) {
  const existing = await ctx.db
    .query("approximateCounters")
    .withIndex("by_key", (q) => q.eq("key", key))
    .first();
  const count = existing?.count ?? 0;
  // Break ties between keys by their xxhash.
  return count * SAMPLING_RATE + (xxHash32(key) % SAMPLING_RATE);
}
