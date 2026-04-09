import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { point, polyline, queryShape } from "@convex-dev/geospatial/validators";
import { geospatial } from "./geospatial";
import schema from "./schema";

export const insert = mutation({
  args: schema.tables.routes.validator.extend({
    coordinates: polyline,
    sortKey: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("routes", {
      name: args.name,
      description: args.description,
      mode: args.mode,
      tags: args.tags,
      durationMinutes: args.durationMinutes,
    });

    await geospatial.polylines.insert(
      ctx,
      id,
      args.coordinates,
      { mode: args.mode, tags: args.tags },
      args.sortKey ?? Date.now(),
    );

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("routes") },
  handler: async (ctx, args) => {
    await geospatial.polylines.remove(ctx, args.id);
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: schema.tables.routes.validator.partial().extend({
    id: v.id("routes"),
    coordinates: v.optional(polyline),
    sortKey: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const { id, coordinates, sortKey, ...fields } = args;

    const doc = await ctx.db.get(id);
    if (!doc) {
      throw new Error(`Route not found: ${id}`);
    }
    await ctx.db.patch(id, fields);

    const mode = args.mode ?? doc.mode;
    const tags = args.tags ?? doc.tags;
    await geospatial.polylines.update(
      ctx,
      id,
      coordinates,
      { mode, tags },
      sortKey,
    );
  },
});

export const get = query({
  args: { id: v.id("routes") },
  handler: async (ctx, args) => {
    const [doc, geo] = await Promise.all([
      ctx.db.get(args.id),
      geospatial.polylines.get(ctx, args.id),
    ]);
    if (!doc || !geo) {
      return null;
    }
    return { ...doc, coordinates: geo.coordinates };
  },
});

export const intersects = query({
  args: {
    shape: queryShape,
    mode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { results, truncated } = await geospatial.polylines.intersects(
      ctx,
      args.shape,
      args.mode ? { mode: args.mode, tags: [] } : undefined,
      args.limit,
    );

    const hydrated = await Promise.all(
      results.map(async (g) => {
        const doc = await ctx.db.get(g.key);
        return doc ? { ...doc, coordinates: g.coordinates } : null;
      }),
    );

    return { results: hydrated.filter(Boolean), truncated };
  },
});

export const nearest = query({
  args: {
    coordinates: point,
    maxDistanceMeters: v.number(),
    mode: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { results, truncated } = await geospatial.polylines.nearest(ctx, {
      point: args.coordinates,
      maxDistance: args.maxDistanceMeters,
      limit: args.limit ?? 100,
      filter: args.mode ? (q) => q.eq("mode", args.mode!) : undefined,
    });

    const hydrated = await Promise.all(
      results.map(async (g) => {
        const doc = await ctx.db.get(g.key);
        return doc
          ? { ...doc, coordinates: g.coordinates, distance: g.distance }
          : null;
      }),
    );

    return { results: hydrated.filter(Boolean), truncated };
  },
});

export const measure = query({
  args: { coordinates: polyline },
  handler: async (ctx, args) => {
    const [lengthM, centroid] = await Promise.all([
      geospatial.polylines.length(ctx, args.coordinates),
      geospatial.polylines.centroid(ctx, args.coordinates),
    ]);
    return {
      lengthM,
      lengthKm: lengthM / 1_000,
      centroid,
    };
  },
});
