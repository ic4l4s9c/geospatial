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

  polygons: defineTable({
    key: v.string(),
    coordinates: polygon,
    south: v.number(),
    north: v.number(),
    west: v.number(),
    east: v.number(),
    sortKey: v.number(),
    filterKeys: filterKeys,
  })
    .index("byKey", ["key"])
    .index("bySortKey", ["sortKey"]),

  polygonCells: defineTable({
    geometryId: v.id("polygons"),
    geometryKey: v.string(),
    cellToken: v.string(),
    level: v.number(),
  })
    .index("byCellToken", ["cellToken"])
    .index("byGeometryKey", ["geometryKey"]),

  polylines: defineTable({
    key: v.string(),
    coordinates: polyline,
    south: v.number(),
    north: v.number(),
    west: v.number(),
    east: v.number(),
    sortKey: v.number(),
    filterKeys: filterKeys,
  })
    .index("byKey", ["key"])
    .index("bySortKey", ["sortKey"]),

  polylineCells: defineTable({
    geometryId: v.id("polylines"),
    geometryKey: v.string(),
    cellToken: v.string(),
    level: v.number(),
  })
    .index("byCellToken", ["cellToken"])
    .index("byGeometryKey", ["geometryKey"]),
});
