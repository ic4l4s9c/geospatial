import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  locations: defineTable({
    name: v.string(),
  }),
  places: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    rating: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
  }).index("by_category", ["category"]),
  areas: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    tags: v.array(v.string()),
    color: v.optional(v.string()),
  }).index("by_type", ["type"]),
  routes: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    mode: v.string(),
    tags: v.array(v.string()),
    durationMinutes: v.optional(v.number()),
  }).index("by_mode", ["mode"]),
});
