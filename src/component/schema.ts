import { defineSchema, defineTable } from "convex/server";
import { type Infer, v, type Validator } from "convex/values";
import {
  filterKeys,
  point,
  polygon,
  polyline,
  primitive,
} from "./validators.js";

export const pointKey = v.string() as Validator<"PointKey">;
export type PointKey = Infer<typeof pointKey>;

export const polygonKey = v.string() as Validator<"PolygonKey">;
export type PolygonKey = Infer<typeof polygonKey>;

export const polylineKey = v.string() as Validator<"PolylineKey">;
export type PolylineKey = Infer<typeof polylineKey>;

export const cellIDToken = v.string() as Validator<"CellIDToken">;
export type CellIDToken = Infer<typeof cellIDToken>;

export const counterKey = v.string() as Validator<"CounterKey">;
export type CounterKey = Infer<typeof counterKey>;

export default defineSchema({
  points: defineTable({
    key: pointKey,
    coordinates: point,
    sortKey: v.number(),
    filterKeys: filterKeys,
  }).index("by_key", ["key"]),

  pointCells: defineTable({
    key: pointKey,
    cell: cellIDToken,
    cursor: v.string(),
  })
    .index("by_cell_and_cursor", ["cell", "cursor"])
    .index("by_key", ["key"]),

  pointFilters: defineTable({
    filterKey: v.string(),
    filterValue: primitive,
    cursor: v.string(),
  }).index("by_filter_and_cursor", ["filterKey", "filterValue", "cursor"]),

  polygons: defineTable({
    key: polygonKey,
    coordinates: polygon,
    south: v.number(),
    north: v.number(),
    west: v.number(),
    east: v.number(),
    sortKey: v.number(),
    filterKeys: filterKeys,
  }).index("by_key", ["key"]),

  polygonCells: defineTable({
    key: polygonKey,
    cell: cellIDToken,
    cursor: v.string(),
  })
    .index("by_cell_and_cursor", ["cell", "cursor"])
    .index("by_key", ["key"]),

  polygonFilters: defineTable({
    filterKey: v.string(),
    filterValue: primitive,
    cursor: v.string(),
  }).index("by_filter_and_cursor", ["filterKey", "filterValue", "cursor"]),

  polylines: defineTable({
    key: polylineKey,
    coordinates: polyline,
    south: v.number(),
    north: v.number(),
    west: v.number(),
    east: v.number(),
    sortKey: v.number(),
    filterKeys: filterKeys,
  }).index("by_key", ["key"]),

  polylineCells: defineTable({
    key: polylineKey,
    cell: cellIDToken,
    cursor: v.string(),
  })
    .index("by_cell_and_cursor", ["cell", "cursor"])
    .index("by_key", ["key"]),

  polylineFilters: defineTable({
    filterKey: v.string(),
    filterValue: primitive,
    cursor: v.string(),
  }).index("by_filter_and_cursor", ["filterKey", "filterValue", "cursor"]),

  approximateCounters: defineTable({
    key: counterKey,
    count: v.number(),
  }).index("by_key", ["key"]),
});
