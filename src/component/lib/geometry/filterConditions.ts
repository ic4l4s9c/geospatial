import type { Primitive } from "../primitive.js";
import type { FilterCondition } from "./types.js";

export function matchesFilterConditions(
  geometry: { filterKeys?: Record<string, Primitive | Primitive[]> },
  mustFilters: FilterCondition[],
  shouldFilters: FilterCondition[],
): boolean {
  const { filterKeys } = geometry;

  for (const { filterKey, filterValue } of mustFilters) {
    const value = filterKeys?.[filterKey];
    if (value === undefined) return false;
    const matches = Array.isArray(value)
      ? value.includes(filterValue)
      : value === filterValue;
    if (!matches) return false;
  }

  if (shouldFilters.length > 0) {
    const anyMatch = shouldFilters.some(({ filterKey, filterValue }) => {
      const value = filterKeys?.[filterKey];
      if (value === undefined) return false;
      return Array.isArray(value)
        ? value.includes(filterValue)
        : value === filterValue;
    });
    if (!anyMatch) return false;
  }

  return true;
}

export function splitFilters(filtering: FilterCondition[]) {
  return {
    mustFilters: filtering.filter((f) => f.occur === "must"),
    shouldFilters: filtering.filter((f) => f.occur === "should"),
  };
}
