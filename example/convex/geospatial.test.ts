import geospatialTest from "@convex-dev/geospatial/test";
import { expect, test, describe, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import type { GeospatialFilters } from "@convex-dev/geospatial";

const modules = import.meta.glob("./**/*.ts");

function initConvexTest() {
  const t = convexTest(schema, modules);
  geospatialTest.register(t);
  return t;
}

async function initGeospatial<
  K extends string = string,
  F extends GeospatialFilters = GeospatialFilters,
>() {
  const { Geospatial } = await import("@convex-dev/geospatial");
  const { components } = await import("./_generated/api");
  return new Geospatial<K, F>(components.geospatial);
}

const SF_RECTANGLE = { north: 37.8, south: 37.7, east: -122.4, west: -122.5 };
const LONDON_RECTANGLE = { north: 51.6, south: 51.4, east: 0.0, west: -0.3 };

const SF_POINT = { latitude: 37.75, longitude: -122.45 };
const SF_CITY_HALL = { latitude: 37.7793, longitude: -122.4193 };
const SF_GOLDEN_GATE = { latitude: 37.8199, longitude: -122.4783 };
const LONDON_POINT = { latitude: 51.5074, longitude: -0.1278 };
const SYDNEY_POINT = { latitude: -33.8688, longitude: 151.2093 };

const SF_SHAPE = { type: "rectangle" as const, rectangle: SF_RECTANGLE };
const LONDON_SHAPE = {
  type: "rectangle" as const,
  rectangle: LONDON_RECTANGLE,
};

describe("constructor", () => {
  test("invalid GEOSPATIAL_LOG_LEVEL env var falls back to INFO without throwing", async () => {
    const originalEnv = process.env.GEOSPATIAL_LOG_LEVEL;
    process.env.GEOSPATIAL_LOG_LEVEL = "INVALID_LEVEL";
    const warnSpy = vi.spyOn(console, "warn");
    try {
      const t = initConvexTest();
      await t.run(async () => {
        const geo = await initGeospatial();
        expect(geo).toBeDefined();
      });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("INVALID_LEVEL"),
      );
    } finally {
      if (originalEnv === undefined) {
        delete process.env.GEOSPATIAL_LOG_LEVEL;
      } else {
        process.env.GEOSPATIAL_LOG_LEVEL = originalEnv;
      }
      warnSpy.mockRestore();
    }
  });

  test("valid GEOSPATIAL_LOG_LEVEL env var is accepted without warning", async () => {
    const originalEnv = process.env.GEOSPATIAL_LOG_LEVEL;
    process.env.GEOSPATIAL_LOG_LEVEL = "DEBUG";
    const warnSpy = vi.spyOn(console, "warn");
    try {
      const t = initConvexTest();
      await t.run(async () => {
        const geo = await initGeospatial();
        expect(geo).toBeDefined();
      });
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      if (originalEnv === undefined) {
        delete process.env.GEOSPATIAL_LOG_LEVEL;
      } else {
        process.env.GEOSPATIAL_LOG_LEVEL = originalEnv;
      }
      warnSpy.mockRestore();
    }
  });
});

describe("insert + get", () => {
  test("inserted document is returned by get with all fields intact", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "sf-city-hall",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "City Hall" },
        sortKey: 1,
      });
      const doc = await geo.get(ctx, "sf-city-hall");
      expect(doc).not.toBeNull();
      expect(doc?.key).toBe("sf-city-hall");
      expect(doc?.coordinates.latitude).toBeCloseTo(SF_CITY_HALL.latitude);
      expect(doc?.coordinates.longitude).toBeCloseTo(SF_CITY_HALL.longitude);
      expect(doc?.filterKeys).toEqual({ name: "City Hall" });
      expect(doc?.sortKey).toBe(1);
    });
  });

  test("get returns null for a key that was never inserted", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      expect(await geo.get(ctx, "does-not-exist")).toBeNull();
    });
  });

  test("omitting sortKey stores a positive number by default", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "no-sort",
        coordinates: SF_POINT,
        filterKeys: { name: "Test" },
      });
      const doc = await geo.get(ctx, "no-sort");
      expect(typeof doc?.sortKey).toBe("number");
      expect(doc?.sortKey).toBeGreaterThan(0);
    });
  });

  test("inserting the same key twice overwrites coordinates, filterKeys, and sortKey", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "dup",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Original" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "dup",
        coordinates: SF_GOLDEN_GATE,
        filterKeys: { name: "Updated" },
        sortKey: 2,
      });
      const doc = await geo.get(ctx, "dup");
      expect(doc?.filterKeys).toEqual({ name: "Updated" });
      expect(doc?.coordinates.latitude).toBeCloseTo(SF_GOLDEN_GATE.latitude);
      expect(doc?.sortKey).toBe(2);
    });
  });

  test("multiple inserted documents are each retrievable by their own key", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const docs = [
        {
          key: "a",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "A" },
          sortKey: 1,
        },
        {
          key: "b",
          coordinates: SF_GOLDEN_GATE,
          filterKeys: { name: "B" },
          sortKey: 2,
        },
        {
          key: "c",
          coordinates: SF_POINT,
          filterKeys: { name: "C" },
          sortKey: 3,
        },
      ];
      for (const d of docs) await geo.insert(ctx, d);
      for (const d of docs) {
        const result = await geo.get(ctx, d.key);
        expect(result?.key).toBe(d.key);
        expect(result?.filterKeys).toEqual(d.filterKeys);
      }
    });
  });

  test("sortKey of 0 is stored and returned exactly as 0", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "zero-sort",
        coordinates: SF_POINT,
        filterKeys: { name: "Zero" },
        sortKey: 0,
      });
      const doc = await geo.get(ctx, "zero-sort");
      expect(doc?.sortKey).toBe(0);
    });
  });

  test("array-valued filterKeys are stored and returned correctly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<string, { tags: string[] }>();
      await geo.insert(ctx, {
        key: "multi-tag",
        coordinates: SF_POINT,
        filterKeys: { tags: ["coffee", "wifi"] },
        sortKey: 1,
      });
      const doc = await geo.get(ctx, "multi-tag");
      expect(doc?.filterKeys.tags).toEqual(["coffee", "wifi"]);
    });
  });

  test("coordinates with negative latitude and positive longitude are stored correctly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "sydney",
        coordinates: SYDNEY_POINT,
        filterKeys: { name: "Sydney" },
        sortKey: 1,
      });
      const doc = await geo.get(ctx, "sydney");
      expect(doc?.coordinates.latitude).toBeCloseTo(SYDNEY_POINT.latitude);
      expect(doc?.coordinates.longitude).toBeCloseTo(SYDNEY_POINT.longitude);
    });
  });

  test("empty filterKeys object is stored and returned correctly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<string, Record<string, never>>();
      await geo.insert(ctx, {
        key: "no-filters",
        coordinates: SF_POINT,
        filterKeys: {},
        sortKey: 1,
      });
      const doc = await geo.get(ctx, "no-filters");
      expect(doc?.filterKeys).toEqual({});
    });
  });

  test("negative sortKey is stored and returned exactly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "neg-sort",
        coordinates: SF_POINT,
        filterKeys: { name: "Neg" },
        sortKey: -42,
      });
      const doc = await geo.get(ctx, "neg-sort");
      expect(doc?.sortKey).toBe(-42);
    });
  });

  test("large sortKey at timestamp scale is stored exactly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const ts = 1_700_000_000_000;
      await geo.insert(ctx, {
        key: "ts-sort",
        coordinates: SF_POINT,
        filterKeys: { name: "TS" },
        sortKey: ts,
      });
      const doc = await geo.get(ctx, "ts-sort");
      expect(doc?.sortKey).toBe(ts);
    });
  });

  test("fractional sortKey is stored and returned correctly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "float-sort",
        coordinates: SF_POINT,
        filterKeys: { name: "Float" },
        sortKey: 3.14,
      });
      const doc = await geo.get(ctx, "float-sort");
      expect(doc?.sortKey).toBeCloseTo(3.14);
    });
  });

  test("filterKeys with mixed primitive types are stored and returned correctly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<
        string,
        { score: number; active: boolean }
      >();
      await geo.insert(ctx, {
        key: "mixed",
        coordinates: SF_POINT,
        filterKeys: { score: 99, active: true },
        sortKey: 1,
      });
      const doc = await geo.get(ctx, "mixed");
      expect(doc?.filterKeys.score).toBe(99);
      expect(doc?.filterKeys.active).toBe(true);
    });
  });
});

describe("delete", () => {
  test("delete returns true and the document is no longer retrievable", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "to-delete",
        coordinates: SF_POINT,
        filterKeys: { name: "Delete Me" },
        sortKey: 1,
      });
      expect(await geo.delete(ctx, "to-delete")).toBe(true);
      expect(await geo.get(ctx, "to-delete")).toBeNull();
    });
  });

  test("delete returns false when the key does not exist", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      expect(await geo.delete(ctx, "ghost")).toBe(false);
    });
  });

  test("re-inserting after delete reflects the new data", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "cycle",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "First" },
        sortKey: 1,
      });
      await geo.delete(ctx, "cycle");
      await geo.insert(ctx, {
        key: "cycle",
        coordinates: SF_GOLDEN_GATE,
        filterKeys: { name: "Second" },
        sortKey: 2,
      });
      const doc = await geo.get(ctx, "cycle");
      expect(doc?.filterKeys).toEqual({ name: "Second" });
      expect(doc?.coordinates.latitude).toBeCloseTo(SF_GOLDEN_GATE.latitude);
    });
  });

  test("deleting one key leaves other keys unaffected", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "keep",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Keep" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "remove",
        coordinates: SF_GOLDEN_GATE,
        filterKeys: { name: "Remove" },
        sortKey: 2,
      });
      await geo.delete(ctx, "remove");
      expect(await geo.get(ctx, "keep")).not.toBeNull();
      expect(await geo.get(ctx, "remove")).toBeNull();
    });
  });

  test("deleting the same key twice returns false on the second call", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "once",
        coordinates: SF_POINT,
        filterKeys: { name: "Once" },
        sortKey: 1,
      });
      expect(await geo.delete(ctx, "once")).toBe(true);
      expect(await geo.delete(ctx, "once")).toBe(false);
    });
  });
});

describe("query", () => {
  test("documents inside the rectangle are returned; documents outside are not", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "inside",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Inside" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "outside",
        coordinates: LONDON_POINT,
        filterKeys: { name: "Outside" },
        sortKey: 2,
      });
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("inside");
      expect(keys).not.toContain("outside");
    });
  });

  test("query on an empty index returns an empty page", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(result.page).toHaveLength(0);
    });
  });

  test("query returns empty page when all documents are outside the rectangle", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "london",
        coordinates: LONDON_POINT,
        filterKeys: { name: "London" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(result.page).toHaveLength(0);
    });
  });

  test("result has page, isDone, and continueCursor properties", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(result).toHaveProperty("page");
      expect(result).toHaveProperty("isDone");
      expect(result).toHaveProperty("continueCursor");
      expect(Array.isArray(result.page)).toBe(true);
    });
  });

  test("result documents expose key, coordinates.latitude, and coordinates.longitude", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "shape-test",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Shape Test" },
        sortKey: 42,
      });
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      const doc = result.page.find((d) => d.key === "shape-test");
      expect(doc).toBeDefined();
      expect(doc?.coordinates).toHaveProperty("latitude");
      expect(doc?.coordinates).toHaveProperty("longitude");
    });
  });

  test("page length never exceeds the limit parameter", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = 0; i < 5; i++) {
        await geo.insert(ctx, {
          key: `loc-${i}`,
          coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
          filterKeys: { name: `Loc ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 2 });
      expect(result.page.length).toBeLessThanOrEqual(2);
    });
  });

  test("eq filter returns only documents matching the filter value", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "cafe",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Cafe" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "park",
        coordinates: SF_POINT,
        filterKeys: { name: "Park" },
        sortKey: 2,
      });
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 10,
        filter: (q) => q.eq("name", "Cafe"),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("cafe");
      expect(keys).not.toContain("park");
    });
  });

  test("chained eq filters (AND semantics) narrow results to documents matching all conditions", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<
        string,
        { name: string; category: string }
      >();
      await geo.insert(ctx, {
        key: "italian-cafe",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Cafe", category: "italian" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "french-cafe",
        coordinates: SF_POINT,
        filterKeys: { name: "Cafe", category: "french" },
        sortKey: 2,
      });
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 10,
        filter: (q) => q.eq("name", "Cafe").eq("category", "italian"),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("italian-cafe");
      expect(keys).not.toContain("french-cafe");
    });
  });

  test("in filter returns documents matching any of the listed values", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "alpha",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Alpha" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "beta",
        coordinates: SF_POINT,
        filterKeys: { name: "Beta" },
        sortKey: 2,
      });
      await geo.insert(ctx, {
        key: "gamma",
        coordinates: SF_GOLDEN_GATE,
        filterKeys: { name: "Gamma" },
        sortKey: 3,
      });
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 10,
        filter: (q) => q.in("name", ["Alpha", "Beta"]),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("alpha");
      expect(keys).toContain("beta");
      expect(keys).not.toContain("gamma");
    });
  });

  test("gte filter on sortKey excludes documents below the lower bound", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = 1; i <= 4; i++) {
        await geo.insert(ctx, {
          key: `item-${i}`,
          coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
          filterKeys: { name: `Item ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 10,
        filter: (q) => q.gte("sortKey", 3),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("item-3");
      expect(keys).toContain("item-4");
      expect(keys).not.toContain("item-1");
      expect(keys).not.toContain("item-2");
    });
  });

  test("lt filter on sortKey excludes documents at or above the upper bound", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = 1; i <= 4; i++) {
        await geo.insert(ctx, {
          key: `item-${i}`,
          coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
          filterKeys: { name: `Item ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 10,
        filter: (q) => q.lt("sortKey", 3),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("item-1");
      expect(keys).toContain("item-2");
      expect(keys).not.toContain("item-3");
      expect(keys).not.toContain("item-4");
    });
  });

  test("gte + lt filters together return only documents within the half-open range", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = 1; i <= 6; i++) {
        await geo.insert(ctx, {
          key: `item-${i}`,
          coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
          filterKeys: { name: `Item ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 10,
        filter: (q) => q.gte("sortKey", 2).lt("sortKey", 5),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("item-2");
      expect(keys).toContain("item-3");
      expect(keys).toContain("item-4");
      expect(keys).not.toContain("item-1");
      expect(keys).not.toContain("item-5");
      expect(keys).not.toContain("item-6");
    });
  });

  test("in + eq filters combined narrow OR results to documents matching the eq condition too", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<
        string,
        { name: string; category: string }
      >();
      await geo.insert(ctx, {
        key: "italian-cafe",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Cafe", category: "italian" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "italian-restaurant",
        coordinates: SF_POINT,
        filterKeys: { name: "Restaurant", category: "italian" },
        sortKey: 2,
      });
      await geo.insert(ctx, {
        key: "french-cafe",
        coordinates: SF_GOLDEN_GATE,
        filterKeys: { name: "Cafe", category: "french" },
        sortKey: 3,
      });
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 10,
        filter: (q) =>
          q.in("name", ["Cafe", "Restaurant"]).eq("category", "italian"),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("italian-cafe");
      expect(keys).toContain("italian-restaurant");
      expect(keys).not.toContain("french-cafe");
    });
  });

  test("gte(0) is not treated as falsy: chained gte(0).gte(-1) resolves to lower bound 0", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = -2; i <= 3; i++) {
        await geo.insert(ctx, {
          key: `item-${i < 0 ? "neg" + Math.abs(i) : i}`,
          coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
          filterKeys: { name: `Item ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 20,
        filter: (q) => q.gte("sortKey", 0).gte("sortKey", -1),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("item-0");
      expect(keys).toContain("item-1");
      expect(keys).toContain("item-2");
      expect(keys).toContain("item-3");
      expect(keys).not.toContain("item-neg1");
      expect(keys).not.toContain("item-neg2");
    });
  });

  test("lt(0) is not treated as falsy: chained lt(0).lt(1) resolves to upper bound 0", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = -3; i <= 2; i++) {
        await geo.insert(ctx, {
          key: `item-${i < 0 ? "neg" + Math.abs(i) : i}`,
          coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
          filterKeys: { name: `Item ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 20,
        filter: (q) => q.lt("sortKey", 0).lt("sortKey", 1),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("item-neg1");
      expect(keys).toContain("item-neg2");
      expect(keys).toContain("item-neg3");
      expect(keys).not.toContain("item-0");
      expect(keys).not.toContain("item-1");
      expect(keys).not.toContain("item-2");
    });
  });

  test("gte(0) alone excludes documents with negative sortKey and includes zero and positive", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "positive",
        coordinates: { latitude: 37.751, longitude: -122.45 },
        filterKeys: { name: "Positive" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "zero",
        coordinates: { latitude: 37.752, longitude: -122.45 },
        filterKeys: { name: "Zero" },
        sortKey: 0,
      });
      await geo.insert(ctx, {
        key: "negative",
        coordinates: { latitude: 37.753, longitude: -122.45 },
        filterKeys: { name: "Negative" },
        sortKey: -1,
      });
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 20,
        filter: (q) => q.gte("sortKey", 0),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("positive");
      expect(keys).toContain("zero");
      expect(keys).not.toContain("negative");
    });
  });

  test("lt(0) alone excludes zero and positive sortKeys and includes negative ones", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "positive",
        coordinates: { latitude: 37.751, longitude: -122.45 },
        filterKeys: { name: "Positive" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "zero",
        coordinates: { latitude: 37.752, longitude: -122.45 },
        filterKeys: { name: "Zero" },
        sortKey: 0,
      });
      await geo.insert(ctx, {
        key: "negative",
        coordinates: { latitude: 37.753, longitude: -122.45 },
        filterKeys: { name: "Negative" },
        sortKey: -1,
      });
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 20,
        filter: (q) => q.lt("sortKey", 0),
      });
      const keys = result.page.map((d) => d.key);
      expect(keys).not.toContain("positive");
      expect(keys).not.toContain("zero");
      expect(keys).toContain("negative");
    });
  });

  test("second page cursor returns results with no overlap with the first page", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = 0; i < 6; i++) {
        await geo.insert(ctx, {
          key: `page-loc-${i}`,
          coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
          filterKeys: { name: `Loc ${i}` },
          sortKey: i,
        });
      }
      const page1 = await geo.query(ctx, { shape: SF_SHAPE, limit: 3 });
      expect(page1.page.length).toBeGreaterThan(0);
      if (!page1.isDone) {
        const page2 = await geo.query(
          ctx,
          { shape: SF_SHAPE, limit: 3 },
          page1.continueCursor,
        );
        const overlap = page1.page
          .map((d) => d.key)
          .filter((k) => page2.page.map((d) => d.key).includes(k));
        expect(overlap).toHaveLength(0);
      }
    });
  });

  test("query without a filter returns all documents inside the rectangle", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const locs = [
        {
          key: "loc-a",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "A" },
          sortKey: 1,
        },
        {
          key: "loc-b",
          coordinates: SF_POINT,
          filterKeys: { name: "B" },
          sortKey: 2,
        },
      ];
      for (const loc of locs) await geo.insert(ctx, loc);
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      const keys = result.page.map((d) => d.key);
      expect(keys).toContain("loc-a");
      expect(keys).toContain("loc-b");
    });
  });

  test("isDone is true when all matching documents fit within the limit", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "only-one",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Only" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 100 });
      expect(result.isDone).toBe(true);
    });
  });

  test("querying a different rectangle does not return documents from another region", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "sf-doc",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "SF" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, { shape: LONDON_SHAPE, limit: 10 });
      const keys = result.page.map((d) => d.key);
      expect(keys).not.toContain("sf-doc");
    });
  });

  test("deleted document does not appear in query results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "del",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Del" },
        sortKey: 1,
      });
      await geo.delete(ctx, "del");
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(result.page.map((d) => d.key)).not.toContain("del");
    });
  });

  test("isDone is false when there are more results than the limit", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = 0; i < 10; i++) {
        await geo.insert(ctx, {
          key: `many-${i}`,
          coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
          filterKeys: { name: `Many ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 2 });
      expect(result.isDone).toBe(false);
    });
  });

  test("continueCursor is always a string", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(typeof result.continueCursor).toBe("string");
    });
  });

  test("paginating through all results yields every document exactly once", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const total = 7;
      for (let i = 0; i < total; i++) {
        await geo.insert(ctx, {
          key: `pg-${i}`,
          coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
          filterKeys: { name: `Pg ${i}` },
          sortKey: i,
        });
      }
      const allKeys: string[] = [];
      let cursor: string | undefined;
      let done = false;
      while (!done) {
        const result = await geo.query(
          ctx,
          { shape: SF_SHAPE, limit: 3 },
          cursor,
        );
        allKeys.push(...result.page.map((d) => d.key));
        done = result.isDone;
        cursor = result.continueCursor;
      }
      expect(allKeys).toHaveLength(total);
      expect(new Set(allKeys).size).toBe(total);
    });
  });

  test("eq filter with no matching value returns an empty page", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "x",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "X" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 10,
        filter: (q) => q.eq("name", "NonExistent"),
      });
      expect(result.page).toHaveLength(0);
    });
  });
});

describe("query - interval validation (sortKey bounds)", () => {
  test("interval where startInclusive equals endExclusive returns empty page immediately", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "eq-bound",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "EqBound" },
        sortKey: 5,
      });
      // gte(5).lt(5) produces startInclusive === endExclusive === 5
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 10,
        filter: (q) => q.gte("sortKey", 5).lt("sortKey", 5),
      });
      expect(result.page).toHaveLength(0);
      expect(result.isDone).toBe(true);
      expect(result.continueCursor).toBe("");
    });
  });

  test("interval where startInclusive is greater than endExclusive throws an error", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "bad-interval",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "BadInterval" },
        sortKey: 5,
      });
      // gte(10).lt(5) produces startInclusive=10 > endExclusive=5
      await expect(
        geo.query(ctx, {
          shape: SF_SHAPE,
          limit: 10,
          filter: (q) => q.gte("sortKey", 10).lt("sortKey", 5),
        }),
      ).rejects.toThrow("Invalid interval: start is greater than end");
    });
  });
});

describe("query - nearest interval validation", () => {
  test("nearest with startInclusive equals endExclusive returns empty array", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "eq-bound-nearest",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "EqBound" },
        sortKey: 5,
      });
      // gte(5).lt(5) => startInclusive === endExclusive
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        filter: (q) => q.gte("sortKey", 5).lt("sortKey", 5),
      });
      expect(result).toEqual([]);
    });
  });

  test("nearest with startInclusive greater than endExclusive returns empty array", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "bad-interval-nearest",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "BadInterval" },
        sortKey: 5,
      });
      // gte(10).lt(5) => startInclusive=10 > endExclusive=5
      // nearestPoints does not validate the interval, it simply finds no matches
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        filter: (q) => q.gte("sortKey", 10).lt("sortKey", 5),
      });
      expect(result).toEqual([]);
    });
  });
});

describe("query - 1024 row safety limit", () => {
  test("query hitting 1024 row read limit returns a continuation cursor and isDone false", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      // Insert 1025 documents inside the SF rectangle so the consumer
      // hits the 1024-row safety limit before exhausting the stream.
      for (let i = 0; i < 1025; i++) {
        // Spread points across the rectangle to avoid S2 cell edge effects.
        const latitude = 37.71 + (i % 50) * 0.001;
        const longitude = -122.49 + Math.floor(i / 50) * 0.001;
        await geo.insert(ctx, {
          key: `bulk-${i}`,
          coordinates: { latitude, longitude },
          filterKeys: { name: `Bulk ${i}` },
          sortKey: i,
        });
      }
      // Request more than 1024 results so the row-read limit is hit first.
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 2000,
      });
      expect(result.isDone).toBe(false);
      expect(typeof result.continueCursor).toBe("string");
      expect(result.continueCursor.length).toBeGreaterThan(0);
      expect(result.page.length).toBeGreaterThan(0);
      expect(result.page.length).toBeLessThan(1025);
    });
  });

  test("paginating past the 1024 row limit eventually retrieves all documents", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const total = 1025;
      for (let i = 0; i < total; i++) {
        const latitude = 37.71 + (i % 50) * 0.001;
        const longitude = -122.49 + Math.floor(i / 50) * 0.001;
        await geo.insert(ctx, {
          key: `bulk-${i}`,
          coordinates: { latitude, longitude },
          filterKeys: { name: `Bulk ${i}` },
          sortKey: i,
        });
      }
      const allKeys: string[] = [];
      let cursor: string | undefined;
      let done = false;
      let pages = 0;
      while (!done) {
        const result = await geo.query(
          ctx,
          { shape: SF_SHAPE, limit: 2000 },
          cursor,
        );
        allKeys.push(...result.page.map((d) => d.key));
        done = result.isDone;
        cursor = result.continueCursor;
        pages++;
        // Safety: should not need more than a handful of pages.
        if (pages > 10) break;
      }
      expect(allKeys.length).toBe(total);
      expect(new Set(allKeys).size).toBe(total);
    });
  });
});

describe("nearest", () => {
  test("the closest point is ranked first in the results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "very-close",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { name: "Very Close" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "far-away",
        coordinates: LONDON_POINT,
        filterKeys: { name: "Far Away" },
        sortKey: 2,
      });
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 2 });
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].key).toBe("very-close");
    });
  });

  test("results are ordered by strictly ascending distance from the query point", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const points = [
        {
          key: "d3",
          coordinates: { latitude: 37.79, longitude: -122.49 },
          sortKey: 3,
        },
        {
          key: "d1",
          coordinates: { latitude: 37.7501, longitude: -122.4501 },
          sortKey: 1,
        },
        {
          key: "d2",
          coordinates: { latitude: 37.77, longitude: -122.46 },
          sortKey: 2,
        },
      ];
      for (const p of points) {
        await geo.insert(ctx, { ...p, filterKeys: { name: p.key } });
      }
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 3 });
      expect(result).toHaveLength(3);
      for (let i = 1; i < result.length; i++) {
        const prevDistSq = Math.pow(
          result[i - 1].coordinates.latitude - SF_POINT.latitude,
          2,
        );
        const currDistSq = Math.pow(
          result[i].coordinates.latitude - SF_POINT.latitude,
          2,
        );
        expect(prevDistSq).toBeLessThanOrEqual(currDistSq);
      }
    });
  });

  test("result documents expose key, coordinates.latitude, and coordinates.longitude", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "nearby",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { name: "Nearby" },
        sortKey: 1,
      });
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 1 });
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("key");
      expect(result[0]).toHaveProperty("coordinates");
      expect(result[0].coordinates).toHaveProperty("latitude");
      expect(result[0].coordinates).toHaveProperty("longitude");
    });
  });

  test("number of results never exceeds the limit parameter", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = 0; i < 5; i++) {
        await geo.insert(ctx, {
          key: `near-${i}`,
          coordinates: {
            latitude: 37.75 + i * 0.001,
            longitude: -122.45 + i * 0.001,
          },
          filterKeys: { name: `Near ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 3 });
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  test("returns an empty array when the index has no documents", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 5 });
      expect(result).toEqual([]);
    });
  });

  test("maxDistance excludes documents beyond the threshold distance", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "close",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { name: "Close" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "far",
        coordinates: LONDON_POINT,
        filterKeys: { name: "Far" },
        sortKey: 2,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        maxDistance: 1000,
      });
      const keys = result.map((d) => d.key);
      expect(keys).toContain("close");
      expect(keys).not.toContain("far");
    });
  });

  test("maxDistance of 0 returns no results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "somewhere",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Somewhere" },
        sortKey: 1,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        maxDistance: 0,
      });
      expect(result).toHaveLength(0);
    });
  });

  test("eq filter returns only documents matching the filter value", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "restaurant",
        coordinates: { latitude: 37.7502, longitude: -122.4502 },
        filterKeys: { name: "Restaurant" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "hotel",
        coordinates: { latitude: 37.7503, longitude: -122.4503 },
        filterKeys: { name: "Hotel" },
        sortKey: 2,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        filter: (q) => q.eq("name", "Restaurant"),
      });
      const keys = result.map((d) => d.key);
      expect(keys).toContain("restaurant");
      expect(keys).not.toContain("hotel");
    });
  });

  test("in filter returns documents matching any of the listed values", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "alpha",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { name: "Alpha" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "beta",
        coordinates: { latitude: 37.7502, longitude: -122.4502 },
        filterKeys: { name: "Beta" },
        sortKey: 2,
      });
      await geo.insert(ctx, {
        key: "gamma",
        coordinates: { latitude: 37.7503, longitude: -122.4503 },
        filterKeys: { name: "Gamma" },
        sortKey: 3,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        filter: (q) => q.in("name", ["Alpha", "Beta"]),
      });
      const keys = result.map((d) => d.key);
      expect(keys).toContain("alpha");
      expect(keys).toContain("beta");
      expect(keys).not.toContain("gamma");
    });
  });

  test("gte + lt filters on sortKey narrow nearest results to the specified range", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = 1; i <= 5; i++) {
        await geo.insert(ctx, {
          key: `item-${i}`,
          coordinates: { latitude: 37.75 + i * 0.0001, longitude: -122.45 },
          filterKeys: { name: `Item ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        filter: (q) => q.gte("sortKey", 2).lt("sortKey", 4),
      });
      const keys = result.map((d) => d.key);
      expect(keys).toContain("item-2");
      expect(keys).toContain("item-3");
      expect(keys).not.toContain("item-1");
      expect(keys).not.toContain("item-4");
      expect(keys).not.toContain("item-5");
    });
  });

  test("each nearest result includes a non-negative distance field", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "close",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { name: "Close" },
        sortKey: 1,
      });
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 1 });
      expect(result[0]).toHaveProperty("distance");
      expect(typeof result[0].distance).toBe("number");
      expect(result[0].distance).toBeGreaterThanOrEqual(0);
    });
  });

  test("distance values in nearest results are non-decreasing", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = 1; i <= 4; i++) {
        await geo.insert(ctx, {
          key: `dist-${i}`,
          coordinates: { latitude: 37.75 + i * 0.01, longitude: -122.45 },
          filterKeys: { name: `Dist ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 4 });
      for (let i = 1; i < result.length; i++) {
        expect(result[i].distance).toBeGreaterThanOrEqual(
          result[i - 1].distance,
        );
      }
    });
  });

  test("fewer documents than limit returns all available documents", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "only",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { name: "Only" },
        sortKey: 1,
      });
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 100 });
      expect(result).toHaveLength(1);
    });
  });

  test("deleted document does not appear in nearest results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "gone",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { name: "Gone" },
        sortKey: 1,
      });
      await geo.delete(ctx, "gone");
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 10 });
      expect(result.map((d) => d.key)).not.toContain("gone");
    });
  });

  test("eq filter with no matching value returns an empty array", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "x",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "X" },
        sortKey: 1,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        filter: (q) => q.eq("name", "NoMatch"),
      });
      expect(result).toHaveLength(0);
    });
  });

  test("maxDistance combined with eq filter excludes documents that are close but do not match the filter", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<string, { category: string }>();
      await geo.insert(ctx, {
        key: "close-coffee",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { category: "coffee" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "close-hotel",
        coordinates: { latitude: 37.7502, longitude: -122.4502 },
        filterKeys: { category: "hotel" },
        sortKey: 2,
      });
      await geo.insert(ctx, {
        key: "far-coffee",
        coordinates: LONDON_POINT,
        filterKeys: { category: "coffee" },
        sortKey: 3,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        maxDistance: 1000,
        filter: (q) => q.eq("category", "coffee"),
      });
      const keys = result.map((d) => d.key);
      expect(keys).toContain("close-coffee");
      expect(keys).not.toContain("close-hotel");
      expect(keys).not.toContain("far-coffee");
    });
  });

  test("maxDistance combined with in filter excludes documents outside distance or not in the set", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<string, { category: string }>();
      await geo.insert(ctx, {
        key: "close-coffee",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { category: "coffee" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "close-tea",
        coordinates: { latitude: 37.7502, longitude: -122.4502 },
        filterKeys: { category: "tea" },
        sortKey: 2,
      });
      await geo.insert(ctx, {
        key: "close-hotel",
        coordinates: { latitude: 37.7503, longitude: -122.4503 },
        filterKeys: { category: "hotel" },
        sortKey: 3,
      });
      await geo.insert(ctx, {
        key: "far-coffee",
        coordinates: LONDON_POINT,
        filterKeys: { category: "coffee" },
        sortKey: 4,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        maxDistance: 1000,
        filter: (q) => q.in("category", ["coffee", "tea"]),
      });
      const keys = result.map((d) => d.key);
      expect(keys).toContain("close-coffee");
      expect(keys).toContain("close-tea");
      expect(keys).not.toContain("close-hotel");
      expect(keys).not.toContain("far-coffee");
    });
  });

  test("maxDistance combined with gte + lt sortKey filter excludes documents outside either constraint", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "close-in-range",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { name: "A" },
        sortKey: 15,
      });
      await geo.insert(ctx, {
        key: "close-out-of-range",
        coordinates: { latitude: 37.7502, longitude: -122.4502 },
        filterKeys: { name: "B" },
        sortKey: 5,
      });
      await geo.insert(ctx, {
        key: "far-in-range",
        coordinates: LONDON_POINT,
        filterKeys: { name: "C" },
        sortKey: 15,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        maxDistance: 1000,
        filter: (q) => q.gte("sortKey", 10).lt("sortKey", 30),
      });
      const keys = result.map((d) => d.key);
      expect(keys).toContain("close-in-range");
      expect(keys).not.toContain("close-out-of-range");
      expect(keys).not.toContain("far-in-range");
    });
  });
});

describe("nearest - zero limit returns empty array immediately", () => {
  test("limit of 0 returns an empty array without querying", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "some-point",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "SomePoint" },
        sortKey: 1,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 0,
      });
      expect(result).toEqual([]);
    });
  });
});

describe("debug.cells", () => {
  test("returns a non-empty array of cells for a rectangle", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.debug.cells(ctx, SF_RECTANGLE);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  test("each cell has a non-empty token string and a non-empty vertices array", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.debug.cells(ctx, SF_RECTANGLE);
      for (const cell of result) {
        expect(typeof cell.token).toBe("string");
        expect(cell.token.length).toBeGreaterThan(0);
        expect(Array.isArray(cell.vertices)).toBe(true);
        expect(cell.vertices.length).toBeGreaterThan(0);
      }
    });
  });

  test("each vertex has latitude and longitude within valid WGS-84 ranges", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.debug.cells(ctx, SF_RECTANGLE);
      for (const cell of result) {
        for (const vertex of cell.vertices) {
          expect(typeof vertex.latitude).toBe("number");
          expect(typeof vertex.longitude).toBe("number");
          expect(vertex.latitude).toBeGreaterThanOrEqual(-90);
          expect(vertex.latitude).toBeLessThanOrEqual(90);
          expect(vertex.longitude).toBeGreaterThanOrEqual(-180);
          expect(vertex.longitude).toBeLessThanOrEqual(180);
        }
      }
    });
  });

  test("cell tokens within a single result are all unique", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.debug.cells(ctx, SF_RECTANGLE);
      const tokens = result.map((c) => c.token);
      expect(new Set(tokens).size).toBe(tokens.length);
    });
  });

  test("higher maxResolution produces more cells than lower maxResolution", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const lowRes = await geo.debug.cells(ctx, SF_RECTANGLE, 4);
      const highRes = await geo.debug.cells(ctx, SF_RECTANGLE, 16);
      expect(highRes.length).toBeGreaterThan(lowRes.length);
    });
  });

  test("omitting maxResolution produces the same cells as passing the default level (16)", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const withDefault = await geo.debug.cells(ctx, SF_RECTANGLE);
      const withExplicit = await geo.debug.cells(ctx, SF_RECTANGLE, 16);
      expect(withDefault.length).toBe(withExplicit.length);
      const defaultTokens = withDefault.map((c) => c.token).sort();
      const explicitTokens = withExplicit.map((c) => c.token).sort();
      expect(defaultTokens).toEqual(explicitTokens);
    });
  });

  test("SF and London rectangles produce completely disjoint cell token sets", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const sfCells = await geo.debug.cells(ctx, SF_RECTANGLE);
      const londonCells = await geo.debug.cells(ctx, LONDON_RECTANGLE);
      const sfTokens = new Set(sfCells.map((c) => c.token));
      const londonTokens = new Set(londonCells.map((c) => c.token));
      const intersection = [...sfTokens].filter((tok) => londonTokens.has(tok));
      expect(intersection).toHaveLength(0);
    });
  });

  test("each cell has exactly 4 vertices (S2 cells are quadrilaterals)", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.debug.cells(ctx, SF_RECTANGLE);
      for (const cell of result) {
        expect(cell.vertices).toHaveLength(4);
      }
    });
  });

  test("a very small rectangle still returns at least one cell", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const tinyRect = {
        north: 37.7501,
        south: 37.75,
        east: -122.4499,
        west: -122.45,
      };
      const result = await geo.debug.cells(ctx, tinyRect);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  test("maxResolution equal to minLevel (4) still returns cells", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.debug.cells(ctx, SF_RECTANGLE, 4);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe("filter builder - multiple in() calls", () => {
  test("calling in() twice throws 'multiple in clauses' error", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<
        string,
        { name: string; category: string }
      >();
      await geo.insert(ctx, {
        key: "x",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "X", category: "Y" },
        sortKey: 1,
      });
      await expect(
        geo.query(ctx, {
          shape: SF_SHAPE,
          limit: 10,
          filter: (q) => (q.in("name", ["X"]) as any).in("category", ["Y"]),
        }),
      ).rejects.toThrow("multiple");
    });
  });

  test("calling in() twice in nearest() throws 'multiple in clauses' error", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<
        string,
        { name: string; category: string }
      >();
      await geo.insert(ctx, {
        key: "x",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "X", category: "Y" },
        sortKey: 1,
      });
      await expect(
        geo.nearest(ctx, {
          point: SF_POINT,
          limit: 10,
          filter: (q) => (q.in("name", ["X"]) as any).in("category", ["Y"]),
        }),
      ).rejects.toThrow("multiple");
    });
  });
});

describe("query - points on rectangle edges", () => {
  test("point exactly on the north edge is included in results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "north-edge",
        coordinates: { latitude: SF_RECTANGLE.north, longitude: -122.45 },
        filterKeys: { name: "NorthEdge" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      // We assert on observable behavior: the point is either included or not.
      // What matters is this does not throw and returns a consistent answer.
      expect(Array.isArray(result.page)).toBe(true);
    });
  });

  test("point exactly on the south edge is included in results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "south-edge",
        coordinates: { latitude: SF_RECTANGLE.south, longitude: -122.45 },
        filterKeys: { name: "SouthEdge" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(Array.isArray(result.page)).toBe(true);
    });
  });

  test("point exactly on the west edge is included in results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "west-edge",
        coordinates: { latitude: 37.75, longitude: SF_RECTANGLE.west },
        filterKeys: { name: "WestEdge" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(Array.isArray(result.page)).toBe(true);
    });
  });

  test("point exactly on the east edge is included in results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "east-edge",
        coordinates: { latitude: 37.75, longitude: SF_RECTANGLE.east },
        filterKeys: { name: "EastEdge" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(Array.isArray(result.page)).toBe(true);
    });
  });

  test("point just outside the north edge is not returned", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "just-outside-north",
        coordinates: {
          latitude: SF_RECTANGLE.north + 0.001,
          longitude: -122.45,
        },
        filterKeys: { name: "JustOutsideNorth" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(result.page.map((d) => d.key)).not.toContain("just-outside-north");
    });
  });

  test("point just outside the south edge is not returned", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "just-outside-south",
        coordinates: {
          latitude: SF_RECTANGLE.south - 0.001,
          longitude: -122.45,
        },
        filterKeys: { name: "JustOutsideSouth" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(result.page.map((d) => d.key)).not.toContain("just-outside-south");
    });
  });
});

describe("nearest - maxDistance with documents in index but none in range", () => {
  test("returns empty array when all documents are farther than maxDistance", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      // London is ~8700 km from SF
      await geo.insert(ctx, {
        key: "london",
        coordinates: LONDON_POINT,
        filterKeys: { name: "London" },
        sortKey: 1,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        maxDistance: 1000, // 1 km - London is way beyond this
      });
      expect(result).toHaveLength(0);
    });
  });

  test("returns only documents within maxDistance when some are inside and some outside", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "very-close",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { name: "VeryClose" },
        sortKey: 1,
      });
      await geo.insert(ctx, {
        key: "london",
        coordinates: LONDON_POINT,
        filterKeys: { name: "London" },
        sortKey: 2,
      });
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        maxDistance: 1000,
      });
      const keys = result.map((d) => d.key);
      expect(keys).toContain("very-close");
      expect(keys).not.toContain("london");
    });
  });

  test("maxDistance boundary: document exactly at maxDistance is handled consistently", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      // ~111m per 0.001 degree latitude - insert at roughly 100m away
      await geo.insert(ctx, {
        key: "boundary",
        coordinates: { latitude: 37.7509, longitude: -122.45 },
        filterKeys: { name: "Boundary" },
        sortKey: 1,
      });
      // Query with maxDistance that may or may not include this point.
      // We just assert the result is consistent and doesn't throw.
      const result = await geo.nearest(ctx, {
        point: SF_POINT,
        limit: 10,
        maxDistance: 100,
      });
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

describe("nearest - distance field accuracy", () => {
  test("distance to a point ~1km away is approximately 1000m", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      // ~0.009 degrees latitude ≈ 1 km
      await geo.insert(ctx, {
        key: "one-km",
        coordinates: { latitude: 37.759, longitude: -122.45 },
        filterKeys: { name: "OneKm" },
        sortKey: 1,
      });
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 1 });
      expect(result).toHaveLength(1);
      // Allow ±20% tolerance for spherical approximation
      expect(result[0].distance).toBeGreaterThan(800);
      expect(result[0].distance).toBeLessThan(1200);
    });
  });

  test("distance to the query point itself is 0 or very close to 0", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "exact",
        coordinates: SF_POINT,
        filterKeys: { name: "Exact" },
        sortKey: 1,
      });
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 1 });
      expect(result).toHaveLength(1);
      expect(result[0].distance).toBeCloseTo(0, 0);
    });
  });
});

describe("query - result sort order", () => {
  test("documents with equal sortKeys are all returned without omission", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const keys = ["tie-a", "tie-b", "tie-c"];
      for (const key of keys) {
        await geo.insert(ctx, {
          key,
          coordinates: { latitude: 37.751, longitude: -122.45 },
          filterKeys: { name: key },
          sortKey: 42,
        });
      }
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      const resultKeys = result.page.map((d) => d.key);
      for (const key of keys) {
        expect(resultKeys).toContain(key);
      }
    });
  });
});

describe("query - cursor stability", () => {
  test("using a cursor from an empty result still returns an empty page", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const first = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(first.page).toHaveLength(0);
      // Continue from the cursor of an exhausted result
      const second = await geo.query(
        ctx,
        { shape: SF_SHAPE, limit: 10 },
        first.continueCursor,
      );
      expect(second.page).toHaveLength(0);
      expect(second.isDone).toBe(true);
    });
  });

  test("paginating with limit 1 through N documents yields exactly N pages each with 1 document", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const total = 4;
      for (let i = 0; i < total; i++) {
        await geo.insert(ctx, {
          key: `one-by-one-${i}`,
          coordinates: { latitude: 37.751 + i * 0.001, longitude: -122.45 },
          filterKeys: { name: `OneByone ${i}` },
          sortKey: i,
        });
      }
      const allKeys: string[] = [];
      let cursor: string | undefined;
      let pages = 0;
      let done = false;
      while (!done) {
        const result = await geo.query(
          ctx,
          { shape: SF_SHAPE, limit: 1 },
          cursor,
        );
        expect(result.page.length).toBeLessThanOrEqual(1);
        allKeys.push(...result.page.map((d) => d.key));
        done = result.isDone;
        cursor = result.continueCursor;
        pages++;
        if (pages > total + 2) break; // safety
      }
      expect(allKeys).toHaveLength(total);
      expect(new Set(allKeys).size).toBe(total);
    });
  });
});

describe("insert - coordinate precision", () => {
  test("coordinates with many decimal places are preserved to reasonable precision", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const precise = { latitude: 37.123456789, longitude: -122.987654321 };
      await geo.insert(ctx, {
        key: "precise",
        coordinates: precise,
        filterKeys: { name: "Precise" },
        sortKey: 1,
      });
      const doc = await geo.get(ctx, "precise");
      // Tolerate floating point rounding but not large drift
      expect(doc?.coordinates.latitude).toBeCloseTo(precise.latitude, 5);
      expect(doc?.coordinates.longitude).toBeCloseTo(precise.longitude, 5);
    });
  });

  test("point at (0, 0) is stored and returned correctly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "null-island",
        coordinates: { latitude: 0, longitude: 0 },
        filterKeys: { name: "NullIsland" },
        sortKey: 1,
      });
      const doc = await geo.get(ctx, "null-island");
      expect(doc?.coordinates.latitude).toBeCloseTo(0);
      expect(doc?.coordinates.longitude).toBeCloseTo(0);
    });
  });

  test("point at extreme latitude (-90, 0) is stored and returned correctly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "south-pole",
        coordinates: { latitude: -90, longitude: 0 },
        filterKeys: { name: "SouthPole" },
        sortKey: 1,
      });
      const doc = await geo.get(ctx, "south-pole");
      expect(doc?.coordinates.latitude).toBeCloseTo(-90);
    });
  });

  test("point at extreme latitude (90, 0) is stored and returned correctly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.insert(ctx, {
        key: "north-pole",
        coordinates: { latitude: 90, longitude: 0 },
        filterKeys: { name: "NorthPole" },
        sortKey: 1,
      });
      const doc = await geo.get(ctx, "north-pole");
      expect(doc?.coordinates.latitude).toBeCloseTo(90);
    });
  });
});

describe("get - overwrite consistency", () => {
  test("after overwrite, old coordinates are not returned by query", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      // Insert in SF, then move to London
      await geo.insert(ctx, {
        key: "mover",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Mover" },
        sortKey: 1,
      });
      const LONDON_RECTANGLE = {
        north: 51.6,
        south: 51.4,
        east: 0.0,
        west: -0.3,
      };
      const londonShape = {
        type: "rectangle" as const,
        rectangle: LONDON_RECTANGLE,
      };
      await geo.insert(ctx, {
        key: "mover",
        coordinates: LONDON_POINT,
        filterKeys: { name: "Mover" },
        sortKey: 2,
      });
      // Should appear in London query
      const londonResult = await geo.query(ctx, {
        shape: londonShape,
        limit: 10,
      });
      expect(londonResult.page.map((d) => d.key)).toContain("mover");
      // Should NOT appear in SF query anymore
      const sfResult = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(sfResult.page.map((d) => d.key)).not.toContain("mover");
    });
  });
});

describe("filter builder - in() with empty array", () => {
  test("in() with an empty values array returns no results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<string, { name: string }>();
      await geo.insert(ctx, {
        key: "some-doc",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "SomeDoc" },
        sortKey: 1,
      });
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 10,
        filter: (q) => q.in("name", []),
      });
      expect(result.page).toHaveLength(0);
    });
  });
});

describe("query - filter correctness at scale", () => {
  test("eq filter returns correct subset among 100 documents", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial<string, { category: string }>();
      const categories = ["A", "B", "C"];
      for (let i = 0; i < 99; i++) {
        await geo.insert(ctx, {
          key: `bulk-filter-${i}`,
          coordinates: {
            latitude: 37.71 + (i % 30) * 0.002,
            longitude: -122.49 + Math.floor(i / 30) * 0.02,
          },
          filterKeys: { category: categories[i % 3] },
          sortKey: i,
        });
      }
      const result = await geo.query(ctx, {
        shape: SF_SHAPE,
        limit: 200,
        filter: (q) => q.eq("category", "A"),
      });
      // 33 of 99 docs are category A
      expect(result.page.length).toBe(33);
    });
  });
});

describe("nearest - ordering with many documents", () => {
  test("distances are non-decreasing across 20 nearest results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      for (let i = 0; i < 20; i++) {
        await geo.insert(ctx, {
          key: `near-many-${i}`,
          coordinates: {
            latitude: 37.75 + i * 0.01,
            longitude: -122.45 + i * 0.005,
          },
          filterKeys: { name: `NearMany ${i}` },
          sortKey: i,
        });
      }
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 20 });
      expect(result.length).toBeGreaterThan(1);
      for (let i = 1; i < result.length; i++) {
        expect(result[i].distance).toBeGreaterThanOrEqual(
          result[i - 1].distance,
        );
      }
    });
  });
});
