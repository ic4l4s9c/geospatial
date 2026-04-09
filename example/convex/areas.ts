import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { point, polygon, queryShape } from "@convex-dev/geospatial/validators";
import { geospatial } from "./geospatial";
import schema from "./schema";

export const insert = mutation({
  args: schema.tables.areas.validator.extend({
    coordinates: polygon,
    sortKey: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("areas", {
      name: args.name,
      description: args.description,
      type: args.type,
      tags: args.tags,
      color: args.color,
    });

    await geospatial.polygons.insert(
      ctx,
      id,
      args.coordinates,
      { type: args.type, tags: args.tags },
      args.sortKey ?? Date.now(),
    );

    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("areas") },
  handler: async (ctx, args) => {
    await geospatial.polygons.remove(ctx, args.id);
    await ctx.db.delete(args.id);
  },
});

export const update = mutation({
  args: schema.tables.areas.validator.partial().extend({
    id: v.id("areas"),
    coordinates: v.optional(polygon),
    sortKey: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    const { id, coordinates, sortKey, ...fields } = args;

    const doc = await ctx.db.get(id);
    if (!doc) {
      throw new Error(`Area not found: ${id}`);
    }
    await ctx.db.patch(id, fields);

    const type = args.type ?? doc.type;
    const tags = args.tags ?? doc.tags;
    await geospatial.polygons.update(
      ctx,
      id,
      coordinates,
      { type, tags },
      sortKey,
    );
  },
});

export const get = query({
  args: { id: v.id("areas") },
  handler: async (ctx, args) => {
    const [doc, geo] = await Promise.all([
      ctx.db.get(args.id),
      geospatial.polygons.get(ctx, args.id),
    ]);
    if (!doc || !geo) return null;
    return { ...doc, coordinates: geo.coordinates };
  },
});

export const containsPoint = query({
  args: {
    coordinates: point,
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { results, truncated } = await geospatial.polygons.containsPoint(
      ctx,
      args.coordinates,
      args.type ? { type: args.type, tags: [] } : undefined,
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

export const intersects = query({
  args: {
    shape: queryShape,
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { results, truncated } = await geospatial.polygons.intersects(
      ctx,
      args.shape,
      args.type ? { type: args.type, tags: [] } : undefined,
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

export const near = query({
  args: {
    coordinates: point,
    maxDistanceMeters: v.number(),
    type: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { results, truncated } = await geospatial.polygons.near(
      ctx,
      args.coordinates,
      args.maxDistanceMeters,
      args.type ? { type: args.type, tags: [] } : undefined,
      args.limit,
    );

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
  args: { coordinates: polygon },
  handler: async (ctx, args) => {
    const [areaSqM, perimeterM, centroid] = await Promise.all([
      geospatial.polygons.area(ctx, args.coordinates),
      geospatial.polygons.perimeter(ctx, args.coordinates),
      geospatial.polygons.centroid(ctx, args.coordinates),
    ]);
    return {
      areaSqM,
      areaHectares: areaSqM / 10_000,
      perimeterM,
      perimeterKm: perimeterM / 1_000,
      centroid,
    };
  },
});
