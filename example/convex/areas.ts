import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { point, polygon, rectangle } from "@convex-dev/geospatial/validators";
import { geospatial } from "./geospatial";
import schema from "./schema";

const queryShape = v.union(
  v.object({ type: v.literal("rectangle"), rectangle: rectangle }),
  v.object({
    type: v.literal("polygon"),
    polygon: polygon,
  }),
);

export const insert = mutation({
  args: schema.tables.areas.validator.extend({
    coordinates: polygon,
  }),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("areas", {
      name: args.name,
      description: args.description,
      type: args.type,
      tags: args.tags,
      color: args.color,
    });

    await geospatial.polygons.insert(ctx, id, args.coordinates, {
      type: args.type,
      tags: args.tags,
    });

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
  }),
  handler: async (ctx, args) => {
    const { id, coordinates, ...fields } = args;

    const doc = await ctx.db.get(id);
    if (!doc) {
      throw new Error(`Area not found: ${id}`);
    }
    await ctx.db.patch(id, fields);

    if (coordinates) {
      const updatedDoc = await ctx.db.get(id);
      await geospatial.polygons.update(ctx, id, coordinates, {
        type: updatedDoc!.type,
        tags: updatedDoc!.tags,
      });
    }
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

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const geoResults = await geospatial.polygons.list(ctx, args.limit);

    const hydrated = await Promise.all(
      geoResults.map(async (g) => {
        const doc = await ctx.db.get(g.key);
        return doc ? { ...doc, coordinates: g.coordinates } : null;
      }),
    );

    return hydrated.filter(Boolean);
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
