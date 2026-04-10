import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import {
  filterKeys,
  point,
  polygon,
  polyline,
  primitive,
} from "./validators.js";

export default defineSchema({
  points: defineTable({
    key: v.string(),
    coordinates: point,
    sortKey: v.number(),
    filterKeys: filterKeys,
  }).index("key", ["key"]),

  pointsByCell: defineTable({
    cell: v.string(),
    tupleKey: v.string(),
  }).index("cell", ["cell", "tupleKey"]),

  pointsByFilterKey: defineTable({
    filterKey: v.string(),
    filterValue: primitive,
    tupleKey: v.string(),
  }).index("filterKey", ["filterKey", "filterValue", "tupleKey"]),

  approximateCounters: defineTable({
    key: v.string(),
    count: v.number(),
  }).index("key", ["key"]),

  geometries: defineTable({
    key: v.string(),
    type: v.union(v.literal("polygon"), v.literal("polyline")),
    coordinates: v.union(polygon, polyline),
    south: v.number(),
    north: v.number(),
    west: v.number(),
    east: v.number(),
    sortKey: v.number(),
    filterKeys: filterKeys,
  })
    .index("byKey", ["key"])
    .index("byType", ["type"])
    .index("bySortKey", ["sortKey"]),

  geometryCells: defineTable({
    geometryId: v.id("geometries"),
    geometryKey: v.string(),
    cellToken: v.string(),
    level: v.number(),
  })
    .index("byCellToken", ["cellToken"])
    .index("byGeometryKey", ["geometryKey"]),
});
