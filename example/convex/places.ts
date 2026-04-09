import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import {
  point,
  queryShape,
  rectangle,
} from "@convex-dev/geospatial/validators";
import { geospatial } from "./geospatial";
import schema from "./schema";

export const insert = mutation({
  args: schema.tables.places.validator.extend({
    coordinates: point,
  }),
  handler: async (ctx, args) => {
    const { coordinates, ...fields } = args
    const id = await ctx.db.insert("places", fields);

    await geospatial.points.insert(
      ctx,
      id,
      coordinates,
      { category: args.category, tags: args.tags },
      args.rating,
    );

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("places") },
  handler: async (ctx, args) => {
    await geospatial.points.remove(ctx, args.id);
    await ctx.db.delete(args.id);
  },
});

export const get = query({
  args: { id: v.id("places") },
  handler: async (ctx, args) => {
    const [doc, geo] = await Promise.all([
      ctx.db.get(args.id),
      geospatial.points.get(ctx, args.id),
    ]);
    if (!doc || !geo) {
      return null;
    }
    return { ...doc, coordinates: geo.coordinates };
  },
});

export const queryByShape = query({
  args: {
    shape: queryShape,
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { category, tags, shape, limit, cursor } = args;

    const { results, nextCursor } = await geospatial.points.query(
      ctx,
      {
        shape,
        limit: limit ?? 64,
        filter:
          category || tags?.length
            ? (q) => {
                const afterIn = tags?.length ? q.in("tags", tags) : null;
                if (category) {
                  return afterIn
                    ? afterIn.eq("category", category)
                    : q.eq("category", category);
                }
                return afterIn!;
              }
            : undefined,
      },
      cursor,
    );

    const hydrated = await Promise.all(
      results.map(async ({ key, coordinates }) => {
        const doc = await ctx.db.get(key);
        return doc ? { ...doc, coordinates } : null;
      }),
    );

    return { results: hydrated.filter(Boolean), nextCursor };
  },
});

export const nearest = query({
  args: {
    coordinates: point,
    limit: v.number(),
    maxDistanceMeters: v.optional(v.number()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { coordinates, limit, maxDistanceMeters, category } = args

    const results = await geospatial.points.nearest(ctx, {
      point: coordinates,
      limit: limit,
      maxDistance: maxDistanceMeters,
      filter: category
        ? (q) => q.eq("category", category)
        : undefined,
    });

    const hydrated = await Promise.all(
      results.map(async (r) => {
        const doc = await ctx.db.get(r.key);
        return doc
          ? { ...doc, coordinates: r.coordinates, distance: r.distance }
          : null;
      }),
    );

    return hydrated.filter(Boolean);
  },
});

export const queryByRating = query({
  args: {
    shape: queryShape,
    minRating: v.number(),
    maxRating: v.optional(v.number()),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { results, nextCursor } = await geospatial.points.query(
      ctx,
      {
        shape: args.shape,
        limit: args.limit ?? 64,
        filter: (q) => {
          const b = q.gte("sortKey", args.minRating);
          return args.maxRating !== undefined
            ? b.lt("sortKey", args.maxRating)
            : b;
        },
      },
      args.cursor,
    );

    const hydrated = await Promise.all(
      results.map(async ({ key, coordinates }) => {
        const doc = await ctx.db.get(key);
        return doc ? { ...doc, coordinates } : null;
      }),
    );

    return { results: hydrated.filter(Boolean), nextCursor };
  },
});

export const debugCells = query({
  args: { rectangle: rectangle, maxResolution: v.optional(v.number()) },
  handler: async (ctx, args) =>
    geospatial.debugCells(ctx, args.rectangle, args.maxResolution),
});
