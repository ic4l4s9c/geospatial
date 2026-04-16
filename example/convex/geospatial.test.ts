import geospatialTest from "@convex-dev/geospatial/test";
import { expect, test, describe } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function initConvexTest() {
  const t = convexTest(schema, modules);
  geospatialTest.register(t);
  return t;
}

async function initGeospatial() {
  const { GeospatialIndex } = await import("@convex-dev/geospatial");
  const { components } = await import("./_generated/api");
  return new GeospatialIndex<string, { name: string; category?: string }>(
    components.geospatial,
  );
}

const SF_RECTANGLE = { north: 37.8, south: 37.7, east: -122.4, west: -122.5 };
const LONDON_RECTANGLE = { north: 51.6, south: 51.4, east: 0.0, west: -0.3 };

const SF_POINT = { latitude: 37.75, longitude: -122.45 };
const SF_CITY_HALL = { latitude: 37.7793, longitude: -122.4193 };
const SF_GOLDEN_GATE = { latitude: 37.8199, longitude: -122.4783 };
const LONDON_POINT = { latitude: 51.5074, longitude: -0.1278 };

const SF_SHAPE = { type: "rectangle" as const, rectangle: SF_RECTANGLE };
const LONDON_SHAPE = {
  type: "rectangle" as const,
  rectangle: LONDON_RECTANGLE,
};

describe("insert + get", () => {
  test("insert and get returns the inserted document", async () => {
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

  test("get returns null for non-existent key", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      expect(await geo.get(ctx, "does-not-exist")).toBeNull();
    });
  });

  test("insert without sortKey defaults to a positive number", async () => {
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
      expect(doc!.sortKey).toBeGreaterThan(0);
    });
  });

  test("inserting the same key twice overwrites the document", async () => {
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

  test("insert multiple documents and retrieve each individually", async () => {
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

  test("insert with sortKey of 0 stores 0 exactly", async () => {
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

  test("insert with array-valued filterKeys stores them correctly", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex<string, { tags: string[] }>(
        components.geospatial,
      );
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
});

describe("delete", () => {
  test("delete returns true and removes the document", async () => {
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

  test("delete returns false for a non-existent key", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      expect(await geo.delete(ctx, "ghost")).toBe(false);
    });
  });

  test("delete then re-insert reflects new data", async () => {
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

  test("deleting one key does not affect another", async () => {
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

  test("calling delete twice on the same key returns false the second time", async () => {
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
  test("returns documents within the rectangle", async () => {
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

  test("returns empty page when no documents exist", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.query(ctx, { shape: SF_SHAPE, limit: 10 });
      expect(result.page).toHaveLength(0);
    });
  });

  test("returns empty page when no documents are in the rectangle", async () => {
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

  test("result has the correct PaginationResult shape", async () => {
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

  test("result documents have key and coordinates properties", async () => {
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

  test("respects the limit parameter", async () => {
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

  test("filter with eq returns only matching documents", async () => {
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

  test("filter with multiple eq conditions (AND) narrows results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex<
        string,
        { name: string; category: string }
      >(components.geospatial);

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

  test("filter with in returns documents matching any of the values", async () => {
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

  test("filter with gte restricts by lower sort key bound", async () => {
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

  test("filter with lt restricts by upper sort key bound", async () => {
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

  test("filter with gte + lt returns only documents in the range", async () => {
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

  test("filter with in + eq narrows the OR results further", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex<
        string,
        { name: string; category: string }
      >(components.geospatial);

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

  test("pagination cursor returns non-overlapping second page", async () => {
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

      // Only attempt page 2 if there really is more data.
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

  test("query without filter returns all documents in rectangle", async () => {
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

  test("isDone is true when all results fit within the limit", async () => {
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

  test("querying a different rectangle does not return SF documents", async () => {
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
});

describe("nearest", () => {
  test("returns closest point first", async () => {
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

  test("results are ordered by ascending distance", async () => {
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
      // Verify strict ascending order by checking each consecutive pair.
      for (let i = 1; i < result.length; i++) {
        const prev = result[i - 1];
        const curr = result[i];
        // Both documents expose coordinates; we rely on ordering contract.
        // Confirm the closer key comes before the farther one.
        const prevLat = prev.coordinates.latitude;
        const currLat = curr.coordinates.latitude;
        const prevDistSq = Math.pow(prevLat - SF_POINT.latitude, 2);
        const currDistSq = Math.pow(currLat - SF_POINT.latitude, 2);
        expect(prevDistSq).toBeLessThanOrEqual(currDistSq);
      }
    });
  });

  test("result documents have key and coordinates properties", async () => {
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

  test("respects the limit parameter", async () => {
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

  test("returns empty array when no documents exist", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      const result = await geo.nearest(ctx, { point: SF_POINT, limit: 5 });
      expect(result).toEqual([]);
    });
  });

  test("maxDistance excludes points beyond the threshold", async () => {
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

  test("filter with eq returns only matching documents", async () => {
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

  test("filter with in returns documents matching any of the values", async () => {
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

  test("filter with gte + lt on sortKey narrows nearest results", async () => {
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
});

describe("debugCells", () => {
  test("returns a non-empty array of cells for a rectangle", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex(components.geospatial);
      const result = await geo.debugCells(ctx, SF_RECTANGLE);
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  test("each cell has a non-empty token string and a non-empty vertices array", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex(components.geospatial);
      const result = await geo.debugCells(ctx, SF_RECTANGLE);
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
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex(components.geospatial);
      const result = await geo.debugCells(ctx, SF_RECTANGLE);
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

  test("cell tokens are unique within a result", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex(components.geospatial);
      const result = await geo.debugCells(ctx, SF_RECTANGLE);
      const tokens = result.map((c) => c.token);
      expect(new Set(tokens).size).toBe(tokens.length);
    });
  });

  test("lower maxResolution produces strictly fewer cells than the default", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex(components.geospatial);
      const lowRes = await geo.debugCells(ctx, SF_RECTANGLE, 4);
      const highRes = await geo.debugCells(ctx, SF_RECTANGLE, 16);
      // A larger rectangle at low resolution must collapse to fewer cells.
      expect(highRes.length).toBeGreaterThan(lowRes.length);
    });
  });

  test("omitting maxResolution produces the same result as passing the default maxLevel (16)", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex(components.geospatial);
      const withDefault = await geo.debugCells(ctx, SF_RECTANGLE);
      const withExplicit = await geo.debugCells(ctx, SF_RECTANGLE, 16);
      expect(withDefault.length).toBe(withExplicit.length);
      const defaultTokens = withDefault.map((c) => c.token).sort();
      const explicitTokens = withExplicit.map((c) => c.token).sort();
      expect(defaultTokens).toEqual(explicitTokens);
    });
  });

  test("SF and London rectangles produce completely disjoint cell token sets", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex(components.geospatial);
      const sfCells = await geo.debugCells(ctx, SF_RECTANGLE);
      const londonCells = await geo.debugCells(ctx, LONDON_RECTANGLE);
      const sfTokens = new Set(sfCells.map((c) => c.token));
      const londonTokens = new Set(londonCells.map((c) => c.token));
      const intersection = [...sfTokens].filter((tok) => londonTokens.has(tok));
      expect(intersection).toHaveLength(0);
    });
  });

  test("each cell has exactly 4 vertices (S2 cells are quadrilaterals)", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const { GeospatialIndex } = await import("@convex-dev/geospatial");
      const { components } = await import("./_generated/api");
      const geo = new GeospatialIndex(components.geospatial);
      const result = await geo.debugCells(ctx, SF_RECTANGLE);
      for (const cell of result) {
        expect(cell.vertices).toHaveLength(4);
      }
    });
  });
});
