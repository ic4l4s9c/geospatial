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

const SF_RECTANGLE = {
  north: 37.8,
  south: 37.7,
  east: -122.4,
  west: -122.5,
};
const LONDON_RECTANGLE = {
  north: 51.6,
  south: 51.4,
  east: 0.0,
  west: -0.3,
};

const SF_POINT = { latitude: 37.75, longitude: -122.45 };
const SF_CITY_HALL = { latitude: 37.7793, longitude: -122.4193 };
const SF_GOLDEN_GATE = { latitude: 37.8199, longitude: -122.4783 };
const LONDON_POINT = { latitude: 51.5074, longitude: -0.1278 };
const SYDNEY_POINT = { latitude: -33.8688, longitude: 151.2093 };

describe("Geospatial constructor()", () => {
  test("falls back to INFO log level and warns when GEOSPATIAL_LOG_LEVEL is invalid", async () => {
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

  test("accepts a valid GEOSPATIAL_LOG_LEVEL without emitting a warning", async () => {
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

describe("debug.cells()", () => {
  describe("return value shape", () => {
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
  });

  describe("maxResolution parameter", () => {
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

    test("higher maxResolution produces more cells than lower maxResolution", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const lowRes = await geo.debug.cells(ctx, SF_RECTANGLE, 4);
        const highRes = await geo.debug.cells(ctx, SF_RECTANGLE, 16);
        expect(highRes.length).toBeGreaterThan(lowRes.length);
      });
    });

    test("maxResolution equal to the minimum level (4) still returns cells", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const result = await geo.debug.cells(ctx, SF_RECTANGLE, 4);
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe("rectangle coverage", () => {
    test("SF and London rectangles produce completely disjoint cell token sets", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const sfCells = await geo.debug.cells(ctx, SF_RECTANGLE);
        const londonCells = await geo.debug.cells(ctx, LONDON_RECTANGLE);
        const sfTokens = new Set(sfCells.map((c) => c.token));
        const londonTokens = new Set(londonCells.map((c) => c.token));
        const intersection = [...sfTokens].filter((tok) =>
          londonTokens.has(tok),
        );
        expect(intersection).toHaveLength(0);
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
  });
});

describe("points.insert() and points.get()", () => {
  describe("basic retrieval", () => {
    test("get returns all stored fields after a successful insert", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "sf-city-hall",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "City Hall" },
          sortKey: 1,
        });
        const doc = await geo.points.get(ctx, "sf-city-hall");
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
        expect(await geo.points.get(ctx, "does-not-exist")).toBeNull();
      });
    });

    test("multiple documents are each independently retrievable by key", async () => {
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
        for (const d of docs) await geo.points.insert(ctx, d);
        for (const d of docs) {
          const result = await geo.points.get(ctx, d.key);
          expect(result?.key).toBe(d.key);
          expect(result?.filterKeys).toEqual(d.filterKeys);
        }
      });
    });
  });

  describe("sortKey handling", () => {
    test("omitting sortKey stores a positive number by default", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "no-sort",
          coordinates: SF_POINT,
          filterKeys: { name: "Test" },
        });
        const doc = await geo.points.get(ctx, "no-sort");
        expect(typeof doc?.sortKey).toBe("number");
        expect(doc?.sortKey).toBeGreaterThan(0);
      });
    });

    test("sortKey of 0 is stored and returned exactly as 0", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "zero-sort",
          coordinates: SF_POINT,
          filterKeys: { name: "Zero" },
          sortKey: 0,
        });
        const doc = await geo.points.get(ctx, "zero-sort");
        expect(doc?.sortKey).toBe(0);
      });
    });

    test("negative sortKey is stored and returned exactly", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "neg-sort",
          coordinates: SF_POINT,
          filterKeys: { name: "Neg" },
          sortKey: -42,
        });
        const doc = await geo.points.get(ctx, "neg-sort");
        expect(doc?.sortKey).toBe(-42);
      });
    });

    test("fractional sortKey is stored and returned correctly", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "float-sort",
          coordinates: SF_POINT,
          filterKeys: { name: "Float" },
          sortKey: 3.14,
        });
        const doc = await geo.points.get(ctx, "float-sort");
        expect(doc?.sortKey).toBeCloseTo(3.14);
      });
    });

    test("large timestamp-scale sortKey is stored exactly", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const ts = 1_700_000_000_000;
        await geo.points.insert(ctx, {
          key: "ts-sort",
          coordinates: SF_POINT,
          filterKeys: { name: "TS" },
          sortKey: ts,
        });
        const doc = await geo.points.get(ctx, "ts-sort");
        expect(doc?.sortKey).toBe(ts);
      });
    });
  });

  describe("filterKeys handling", () => {
    test("empty filterKeys object is stored and returned correctly", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial<string, Record<string, never>>();
        await geo.points.insert(ctx, {
          key: "no-filters",
          coordinates: SF_POINT,
          filterKeys: {},
          sortKey: 1,
        });
        const doc = await geo.points.get(ctx, "no-filters");
        expect(doc?.filterKeys).toEqual({});
      });
    });

    test("array-valued filterKeys are stored and returned correctly", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial<string, { tags: string[] }>();
        await geo.points.insert(ctx, {
          key: "multi-tag",
          coordinates: SF_POINT,
          filterKeys: { tags: ["coffee", "wifi"] },
          sortKey: 1,
        });
        const doc = await geo.points.get(ctx, "multi-tag");
        expect(doc?.filterKeys.tags).toEqual(["coffee", "wifi"]);
      });
    });

    test("filterKeys with mixed primitive types are stored and returned correctly", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial<
          string,
          { score: number; active: boolean }
        >();
        await geo.points.insert(ctx, {
          key: "mixed",
          coordinates: SF_POINT,
          filterKeys: { score: 99, active: true },
          sortKey: 1,
        });
        const doc = await geo.points.get(ctx, "mixed");
        expect(doc?.filterKeys.score).toBe(99);
        expect(doc?.filterKeys.active).toBe(true);
      });
    });
  });

  describe("coordinate handling", () => {
    test("coordinates with negative latitude and positive longitude are stored correctly", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "sydney",
          coordinates: SYDNEY_POINT,
          filterKeys: { name: "Sydney" },
          sortKey: 1,
        });
        const doc = await geo.points.get(ctx, "sydney");
        expect(doc?.coordinates.latitude).toBeCloseTo(SYDNEY_POINT.latitude);
        expect(doc?.coordinates.longitude).toBeCloseTo(SYDNEY_POINT.longitude);
      });
    });

    test("coordinates with many decimal places are preserved to reasonable precision", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const precise = { latitude: 37.123456789, longitude: -122.987654321 };
        await geo.points.insert(ctx, {
          key: "precise",
          coordinates: precise,
          filterKeys: { name: "Precise" },
          sortKey: 1,
        });
        const doc = await geo.points.get(ctx, "precise");
        expect(doc?.coordinates.latitude).toBeCloseTo(precise.latitude, 5);
        expect(doc?.coordinates.longitude).toBeCloseTo(precise.longitude, 5);
      });
    });

    test("point at (0, 0) — null island — is stored and returned correctly", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "null-island",
          coordinates: { latitude: 0, longitude: 0 },
          filterKeys: { name: "NullIsland" },
          sortKey: 1,
        });
        const doc = await geo.points.get(ctx, "null-island");
        expect(doc?.coordinates.latitude).toBeCloseTo(0);
        expect(doc?.coordinates.longitude).toBeCloseTo(0);
      });
    });

    test("point at the south pole (-90, 0) is stored and returned correctly", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "south-pole",
          coordinates: { latitude: -90, longitude: 0 },
          filterKeys: { name: "SouthPole" },
          sortKey: 1,
        });
        const doc = await geo.points.get(ctx, "south-pole");
        expect(doc?.coordinates.latitude).toBeCloseTo(-90);
      });
    });

    test("point at the north pole (90, 0) is stored and returned correctly", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "north-pole",
          coordinates: { latitude: 90, longitude: 0 },
          filterKeys: { name: "NorthPole" },
          sortKey: 1,
        });
        const doc = await geo.points.get(ctx, "north-pole");
        expect(doc?.coordinates.latitude).toBeCloseTo(90);
      });
    });
  });

  describe("upsert / overwrite behaviour", () => {
    test("inserting the same key twice overwrites coordinates, filterKeys, and sortKey", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "dup",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "Original" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "dup",
          coordinates: SF_GOLDEN_GATE,
          filterKeys: { name: "Updated" },
          sortKey: 2,
        });
        const doc = await geo.points.get(ctx, "dup");
        expect(doc?.filterKeys).toEqual({ name: "Updated" });
        expect(doc?.coordinates.latitude).toBeCloseTo(SF_GOLDEN_GATE.latitude);
        expect(doc?.sortKey).toBe(2);
      });
    });

    test("overwritten document no longer appears in the original region's query", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "mover",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "Mover" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "mover",
          coordinates: LONDON_POINT,
          filterKeys: { name: "Mover" },
          sortKey: 2,
        });
        const londonResult = await geo.points
          .query(ctx)
          .within(LONDON_RECTANGLE)
          .limit(10)
          .paginate();
        expect(londonResult.page.map((d) => d.key)).toContain("mover");

        const sfResult = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(sfResult.page.map((d) => d.key)).not.toContain("mover");
      });
    });
  });
});

describe("points.delete()", () => {
  test("returns true and makes the document unretrievable", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.points.insert(ctx, {
        key: "to-delete",
        coordinates: SF_POINT,
        filterKeys: { name: "Delete Me" },
        sortKey: 1,
      });
      expect(await geo.points.delete(ctx, "to-delete")).toBe(true);
      expect(await geo.points.get(ctx, "to-delete")).toBeNull();
    });
  });

  test("returns false when the key does not exist", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      expect(await geo.points.delete(ctx, "ghost")).toBe(false);
    });
  });

  test("returns false on a second delete of the same key", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.points.insert(ctx, {
        key: "once",
        coordinates: SF_POINT,
        filterKeys: { name: "Once" },
        sortKey: 1,
      });
      expect(await geo.points.delete(ctx, "once")).toBe(true);
      expect(await geo.points.delete(ctx, "once")).toBe(false);
    });
  });

  test("deleting one key leaves sibling keys unaffected", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.points.insert(ctx, {
        key: "keep",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Keep" },
        sortKey: 1,
      });
      await geo.points.insert(ctx, {
        key: "remove",
        coordinates: SF_GOLDEN_GATE,
        filterKeys: { name: "Remove" },
        sortKey: 2,
      });
      await geo.points.delete(ctx, "remove");
      expect(await geo.points.get(ctx, "keep")).not.toBeNull();
      expect(await geo.points.get(ctx, "remove")).toBeNull();
    });
  });

  test("re-inserting after delete reflects the new data", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.points.insert(ctx, {
        key: "cycle",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "First" },
        sortKey: 1,
      });
      await geo.points.delete(ctx, "cycle");
      await geo.points.insert(ctx, {
        key: "cycle",
        coordinates: SF_GOLDEN_GATE,
        filterKeys: { name: "Second" },
        sortKey: 2,
      });
      const doc = await geo.points.get(ctx, "cycle");
      expect(doc?.filterKeys).toEqual({ name: "Second" });
      expect(doc?.coordinates.latitude).toBeCloseTo(SF_GOLDEN_GATE.latitude);
    });
  });

  test("deleted document does not appear in within() query results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.points.insert(ctx, {
        key: "del",
        coordinates: SF_CITY_HALL,
        filterKeys: { name: "Del" },
        sortKey: 1,
      });
      await geo.points.delete(ctx, "del");
      const result = await geo.points
        .query(ctx)
        .within(SF_RECTANGLE)
        .limit(10)
        .paginate();
      expect(result.page.map((d) => d.key)).not.toContain("del");
    });
  });

  test("deleted document does not appear in nearest() query results", async () => {
    const t = initConvexTest();
    await t.run(async (ctx) => {
      const geo = await initGeospatial();
      await geo.points.insert(ctx, {
        key: "gone",
        coordinates: { latitude: 37.7501, longitude: -122.4501 },
        filterKeys: { name: "Gone" },
        sortKey: 1,
      });
      await geo.points.delete(ctx, "gone");
      const result = await geo.points
        .query(ctx)
        .nearest(SF_POINT)
        .limit(10)
        .collect();
      expect(result.map((d) => d.key)).not.toContain("gone");
    });
  });
});

describe("points.query().within()", () => {
  describe("basic inclusion / exclusion", () => {
    test("returns documents inside the rectangle and omits documents outside", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "inside",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "Inside" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "outside",
          coordinates: LONDON_POINT,
          filterKeys: { name: "Outside" },
          sortKey: 2,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        const keys = result.page.map((d) => d.key);
        expect(keys).toContain("inside");
        expect(keys).not.toContain("outside");
      });
    });

    test("returns an empty page when no documents have been inserted", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(result.page).toHaveLength(0);
      });
    });

    test("returns an empty page when all documents are outside the rectangle", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "london",
          coordinates: LONDON_POINT,
          filterKeys: { name: "London" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(result.page).toHaveLength(0);
      });
    });

    test("returns all inserted documents when none are filtered out", async () => {
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
        for (const loc of locs) await geo.points.insert(ctx, loc);
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        const keys = result.page.map((d) => d.key);
        expect(keys).toContain("loc-a");
        expect(keys).toContain("loc-b");
      });
    });

    test("querying a different rectangle does not return documents from another region", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "sf-doc",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "SF" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .within(LONDON_RECTANGLE)
          .limit(10)
          .paginate();
        expect(result.page.map((d) => d.key)).not.toContain("sf-doc");
      });
    });
  });

  describe("result shape", () => {
    test("result object exposes page, isDone, and continueCursor properties", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(result).toHaveProperty("page");
        expect(result).toHaveProperty("isDone");
        expect(result).toHaveProperty("continueCursor");
        expect(Array.isArray(result.page)).toBe(true);
      });
    });

    test("each result document exposes key, coordinates.latitude, and coordinates.longitude", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "shape-test",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "Shape Test" },
          sortKey: 42,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        const doc = result.page.find((d) => d.key === "shape-test");
        expect(doc).toBeDefined();
        expect(doc?.coordinates).toHaveProperty("latitude");
        expect(doc?.coordinates).toHaveProperty("longitude");
      });
    });

    test("continueCursor is always a string", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(typeof result.continueCursor).toBe("string");
      });
    });
  });

  describe("limit and isDone behaviour", () => {
    test("page length never exceeds the limit parameter", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        for (let i = 0; i < 5; i++) {
          await geo.points.insert(ctx, {
            key: `loc-${i}`,
            coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
            filterKeys: { name: `Loc ${i}` },
            sortKey: i,
          });
        }
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(2)
          .paginate();
        expect(result.page.length).toBeLessThanOrEqual(2);
      });
    });

    test("isDone is true when all matching documents fit within the limit", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "only-one",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "Only" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(100)
          .paginate();
        expect(result.isDone).toBe(true);
      });
    });

    test("isDone is false when there are more results than the limit", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        for (let i = 0; i < 10; i++) {
          await geo.points.insert(ctx, {
            key: `many-${i}`,
            coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
            filterKeys: { name: `Many ${i}` },
            sortKey: i,
          });
        }
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(2)
          .paginate();
        expect(result.isDone).toBe(false);
      });
    });

    test("documents with equal sortKeys are all returned without omission", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const keys = ["tie-a", "tie-b", "tie-c"];
        for (const key of keys) {
          await geo.points.insert(ctx, {
            key,
            coordinates: { latitude: 37.751, longitude: -122.45 },
            filterKeys: { name: key },
            sortKey: 42,
          });
        }
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        const resultKeys = result.page.map((d) => d.key);
        for (const key of keys) {
          expect(resultKeys).toContain(key);
        }
      });
    });
  });

  describe("filter()", () => {
    test("eq filter returns only documents matching the specified value", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "cafe",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "Cafe" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "park",
          coordinates: SF_POINT,
          filterKeys: { name: "Park" },
          sortKey: 2,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .filter((q) => q.eq("name", "Cafe"))
          .limit(10)
          .paginate();
        const keys = result.page.map((d) => d.key);
        expect(keys).toContain("cafe");
        expect(keys).not.toContain("park");
      });
    });

    test("eq filter with no matching value returns an empty page", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "x",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "X" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .filter((q) => q.eq("name", "NonExistent"))
          .limit(10)
          .paginate();
        expect(result.page).toHaveLength(0);
      });
    });

    test("chained eq filters apply AND semantics, narrowing to documents matching all conditions", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial<
          string,
          { name: string; category: string }
        >();
        await geo.points.insert(ctx, {
          key: "italian-cafe",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "Cafe", category: "italian" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "french-cafe",
          coordinates: SF_POINT,
          filterKeys: { name: "Cafe", category: "french" },
          sortKey: 2,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .filter((q) => q.eq("name", "Cafe").eq("category", "italian"))
          .limit(10)
          .paginate();
        const keys = result.page.map((d) => d.key);
        expect(keys).toContain("italian-cafe");
        expect(keys).not.toContain("french-cafe");
      });
    });

    test("in filter returns documents matching any value in the set", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "alpha",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "Alpha" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "beta",
          coordinates: SF_POINT,
          filterKeys: { name: "Beta" },
          sortKey: 2,
        });
        await geo.points.insert(ctx, {
          key: "gamma",
          coordinates: SF_GOLDEN_GATE,
          filterKeys: { name: "Gamma" },
          sortKey: 3,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .filter((q) => q.in("name", ["Alpha", "Beta"]))
          .limit(10)
          .paginate();
        const keys = result.page.map((d) => d.key);
        expect(keys).toContain("alpha");
        expect(keys).toContain("beta");
        expect(keys).not.toContain("gamma");
      });
    });

    test("in + eq filters combined narrow results to documents satisfying both constraints", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial<
          string,
          { name: string; category: string }
        >();
        await geo.points.insert(ctx, {
          key: "italian-cafe",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "Cafe", category: "italian" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "italian-restaurant",
          coordinates: SF_POINT,
          filterKeys: { name: "Restaurant", category: "italian" },
          sortKey: 2,
        });
        await geo.points.insert(ctx, {
          key: "french-cafe",
          coordinates: SF_GOLDEN_GATE,
          filterKeys: { name: "Cafe", category: "french" },
          sortKey: 3,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .filter((q) =>
            q.in("name", ["Cafe", "Restaurant"]).eq("category", "italian"),
          )
          .limit(10)
          .paginate();
        const keys = result.page.map((d) => d.key);
        expect(keys).toContain("italian-cafe");
        expect(keys).toContain("italian-restaurant");
        expect(keys).not.toContain("french-cafe");
      });
    });

    test("calling in() twice throws a 'multiple in clauses' error", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial<
          string,
          { name: string; category: string }
        >();
        await geo.points.insert(ctx, {
          key: "x",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "X", category: "Y" },
          sortKey: 1,
        });
        await expect(
          geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .filter((q) => (q.in("name", ["X"]) as any).in("category", ["Y"]))
            .limit(10)
            .paginate(),
        ).rejects.toThrow("multiple");
      });
    });

    describe("sortKey range filters", () => {
      test("gte filter excludes documents with a sortKey below the lower bound", async () => {
        const t = initConvexTest();
        await t.run(async (ctx) => {
          const geo = await initGeospatial();
          for (let i = 1; i <= 4; i++) {
            await geo.points.insert(ctx, {
              key: `item-${i}`,
              coordinates: {
                latitude: 37.75 + i * 0.001,
                longitude: -122.45,
              },
              filterKeys: { name: `Item ${i}` },
              sortKey: i,
            });
          }
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .filter((q) => q.gte("sortKey", 3))
            .limit(10)
            .paginate();
          const keys = result.page.map((d) => d.key);
          expect(keys).toContain("item-3");
          expect(keys).toContain("item-4");
          expect(keys).not.toContain("item-1");
          expect(keys).not.toContain("item-2");
        });
      });

      test("lt filter excludes documents with a sortKey at or above the upper bound", async () => {
        const t = initConvexTest();
        await t.run(async (ctx) => {
          const geo = await initGeospatial();
          for (let i = 1; i <= 4; i++) {
            await geo.points.insert(ctx, {
              key: `item-${i}`,
              coordinates: {
                latitude: 37.75 + i * 0.001,
                longitude: -122.45,
              },
              filterKeys: { name: `Item ${i}` },
              sortKey: i,
            });
          }
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .filter((q) => q.lt("sortKey", 3))
            .limit(10)
            .paginate();
          const keys = result.page.map((d) => d.key);
          expect(keys).toContain("item-1");
          expect(keys).toContain("item-2");
          expect(keys).not.toContain("item-3");
          expect(keys).not.toContain("item-4");
        });
      });

      test("gte + lt together return only documents in the half-open [start, end) range", async () => {
        const t = initConvexTest();
        await t.run(async (ctx) => {
          const geo = await initGeospatial();
          for (let i = 1; i <= 6; i++) {
            await geo.points.insert(ctx, {
              key: `item-${i}`,
              coordinates: {
                latitude: 37.75 + i * 0.001,
                longitude: -122.45,
              },
              filterKeys: { name: `Item ${i}` },
              sortKey: i,
            });
          }
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .filter((q) => q.gte("sortKey", 2).lt("sortKey", 5))
            .limit(10)
            .paginate();
          const keys = result.page.map((d) => d.key);
          expect(keys).toContain("item-2");
          expect(keys).toContain("item-3");
          expect(keys).toContain("item-4");
          expect(keys).not.toContain("item-1");
          expect(keys).not.toContain("item-5");
          expect(keys).not.toContain("item-6");
        });
      });

      test("gte(0) is not treated as falsy: the stricter of two chained gte calls wins", async () => {
        const t = initConvexTest();
        await t.run(async (ctx) => {
          const geo = await initGeospatial();
          for (let i = -2; i <= 3; i++) {
            await geo.points.insert(ctx, {
              key: `item-${i < 0 ? "neg" + Math.abs(i) : i}`,
              coordinates: {
                latitude: 37.75 + i * 0.001,
                longitude: -122.45,
              },
              filterKeys: { name: `Item ${i}` },
              sortKey: i,
            });
          }
          // gte(0) is stricter than gte(-1), so the effective lower bound is 0
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .filter((q) => q.gte("sortKey", 0).gte("sortKey", -1))
            .limit(20)
            .paginate();
          const keys = result.page.map((d) => d.key);
          expect(keys).toContain("item-0");
          expect(keys).toContain("item-1");
          expect(keys).toContain("item-2");
          expect(keys).toContain("item-3");
          expect(keys).not.toContain("item-neg1");
          expect(keys).not.toContain("item-neg2");
        });
      });

      test("lt(0) is not treated as falsy: the stricter of two chained lt calls wins", async () => {
        const t = initConvexTest();
        await t.run(async (ctx) => {
          const geo = await initGeospatial();
          for (let i = -3; i <= 2; i++) {
            await geo.points.insert(ctx, {
              key: `item-${i < 0 ? "neg" + Math.abs(i) : i}`,
              coordinates: {
                latitude: 37.75 + i * 0.001,
                longitude: -122.45,
              },
              filterKeys: { name: `Item ${i}` },
              sortKey: i,
            });
          }
          // lt(0) is stricter than lt(1), so the effective upper bound is 0
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .filter((q) => q.lt("sortKey", 0).lt("sortKey", 1))
            .limit(20)
            .paginate();
          const keys = result.page.map((d) => d.key);
          expect(keys).toContain("item-neg1");
          expect(keys).toContain("item-neg2");
          expect(keys).toContain("item-neg3");
          expect(keys).not.toContain("item-0");
          expect(keys).not.toContain("item-1");
          expect(keys).not.toContain("item-2");
        });
      });

      test("gte(0) excludes negative sortKeys and includes zero and positive ones", async () => {
        const t = initConvexTest();
        await t.run(async (ctx) => {
          const geo = await initGeospatial();
          await geo.points.insert(ctx, {
            key: "positive",
            coordinates: { latitude: 37.751, longitude: -122.45 },
            filterKeys: { name: "Positive" },
            sortKey: 1,
          });
          await geo.points.insert(ctx, {
            key: "zero",
            coordinates: { latitude: 37.752, longitude: -122.45 },
            filterKeys: { name: "Zero" },
            sortKey: 0,
          });
          await geo.points.insert(ctx, {
            key: "negative",
            coordinates: { latitude: 37.753, longitude: -122.45 },
            filterKeys: { name: "Negative" },
            sortKey: -1,
          });
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .filter((q) => q.gte("sortKey", 0))
            .limit(20)
            .paginate();
          const keys = result.page.map((d) => d.key);
          expect(keys).toContain("positive");
          expect(keys).toContain("zero");
          expect(keys).not.toContain("negative");
        });
      });

      test("lt(0) excludes zero and positive sortKeys and includes negative ones", async () => {
        const t = initConvexTest();
        await t.run(async (ctx) => {
          const geo = await initGeospatial();
          await geo.points.insert(ctx, {
            key: "positive",
            coordinates: { latitude: 37.751, longitude: -122.45 },
            filterKeys: { name: "Positive" },
            sortKey: 1,
          });
          await geo.points.insert(ctx, {
            key: "zero",
            coordinates: { latitude: 37.752, longitude: -122.45 },
            filterKeys: { name: "Zero" },
            sortKey: 0,
          });
          await geo.points.insert(ctx, {
            key: "negative",
            coordinates: { latitude: 37.753, longitude: -122.45 },
            filterKeys: { name: "Negative" },
            sortKey: -1,
          });
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .filter((q) => q.lt("sortKey", 0))
            .limit(20)
            .paginate();
          const keys = result.page.map((d) => d.key);
          expect(keys).not.toContain("positive");
          expect(keys).not.toContain("zero");
          expect(keys).toContain("negative");
        });
      });

      test("equal start and end bounds return an empty page immediately", async () => {
        const t = initConvexTest();
        await t.run(async (ctx) => {
          const geo = await initGeospatial();
          await geo.points.insert(ctx, {
            key: "eq-bound",
            coordinates: SF_CITY_HALL,
            filterKeys: { name: "EqBound" },
            sortKey: 5,
          });
          // gte(5).lt(5) → startInclusive === endExclusive
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .filter((q) => q.gte("sortKey", 5).lt("sortKey", 5))
            .limit(10)
            .paginate();
          expect(result.page).toHaveLength(0);
          expect(result.isDone).toBe(true);
          expect(result.continueCursor).toBe("");
        });
      });

      test("inverted bounds (start > end) throw 'Invalid interval: start is greater than end'", async () => {
        const t = initConvexTest();
        await t.run(async (ctx) => {
          const geo = await initGeospatial();
          await geo.points.insert(ctx, {
            key: "bad-interval",
            coordinates: SF_CITY_HALL,
            filterKeys: { name: "BadInterval" },
            sortKey: 5,
          });
          // gte(10).lt(5) → startInclusive=10 > endExclusive=5
          await expect(
            geo.points
              .query(ctx)
              .within(SF_RECTANGLE)
              .filter((q) => q.gte("sortKey", 10).lt("sortKey", 5))
              .limit(10)
              .paginate(),
          ).rejects.toThrow("Invalid interval: start is greater than end");
        });
      });

      test("eq filter returns the correct subset among 100 documents", async () => {
        const t = initConvexTest();
        await t.run(async (ctx) => {
          const geo = await initGeospatial<string, { category: string }>();
          const categories = ["A", "B", "C"];
          for (let i = 0; i < 99; i++) {
            await geo.points.insert(ctx, {
              key: `bulk-filter-${i}`,
              coordinates: {
                latitude: 37.71 + (i % 30) * 0.002,
                longitude: -122.49 + Math.floor(i / 30) * 0.02,
              },
              filterKeys: { category: categories[i % 3] },
              sortKey: i,
            });
          }
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .filter((q) => q.eq("category", "A"))
            .limit(200)
            .paginate();
          // 33 of 99 docs are category A
          expect(result.page.length).toBe(33);
        });
      });
    });
  });

  describe("pagination and cursors", () => {
    test("second page has no overlap with the first page", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        for (let i = 0; i < 6; i++) {
          await geo.points.insert(ctx, {
            key: `page-loc-${i}`,
            coordinates: { latitude: 37.75 + i * 0.001, longitude: -122.45 },
            filterKeys: { name: `Loc ${i}` },
            sortKey: i,
          });
        }
        const page1 = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(3)
          .paginate();
        expect(page1.page.length).toBeGreaterThan(0);
        if (!page1.isDone) {
          const page2 = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .limit(3)
            .paginate(page1.continueCursor);
          const overlap = page1.page
            .map((d) => d.key)
            .filter((k) => page2.page.map((d) => d.key).includes(k));
          expect(overlap).toHaveLength(0);
        }
      });
    });

    test("paginating through all results yields every document exactly once", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const total = 7;
        for (let i = 0; i < total; i++) {
          await geo.points.insert(ctx, {
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
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .limit(3)
            .paginate(cursor);
          allKeys.push(...result.page.map((d) => d.key));
          done = result.isDone;
          cursor = result.continueCursor;
        }
        expect(allKeys).toHaveLength(total);
        expect(new Set(allKeys).size).toBe(total);
      });
    });

    test("paginating with limit 1 through N documents yields exactly N pages each with 1 document", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const total = 4;
        for (let i = 0; i < total; i++) {
          await geo.points.insert(ctx, {
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
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .limit(1)
            .paginate(cursor);
          expect(result.page.length).toBeLessThanOrEqual(1);
          allKeys.push(...result.page.map((d) => d.key));
          done = result.isDone;
          cursor = result.continueCursor;
          pages++;
          if (pages > total + 2) break;
        }
        expect(allKeys).toHaveLength(total);
        expect(new Set(allKeys).size).toBe(total);
      });
    });

    test("continuing from an exhausted cursor returns an empty page with isDone true", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const first = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(first.page).toHaveLength(0);
        const second = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate(first.continueCursor);
        expect(second.page).toHaveLength(0);
        expect(second.isDone).toBe(true);
      });
    });
  });

  describe("1024-row safety limit", () => {
    test("hitting the row-read limit returns a non-empty page with isDone false and a non-empty cursor", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        for (let i = 0; i < 1025; i++) {
          const latitude = 37.71 + (i % 50) * 0.001;
          const longitude = -122.49 + Math.floor(i / 50) * 0.001;
          await geo.points.insert(ctx, {
            key: `bulk-${i}`,
            coordinates: { latitude, longitude },
            filterKeys: { name: `Bulk ${i}` },
            sortKey: i,
          });
        }
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(2000)
          .paginate();
        expect(result.isDone).toBe(false);
        expect(typeof result.continueCursor).toBe("string");
        expect(result.continueCursor.length).toBeGreaterThan(0);
        expect(result.page.length).toBeGreaterThan(0);
        expect(result.page.length).toBeLessThan(1025);
      });
    });

    test("paginating past the row-read limit eventually retrieves all documents", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const total = 1025;
        for (let i = 0; i < total; i++) {
          const latitude = 37.71 + (i % 50) * 0.001;
          const longitude = -122.49 + Math.floor(i / 50) * 0.001;
          await geo.points.insert(ctx, {
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
          const result = await geo.points
            .query(ctx)
            .within(SF_RECTANGLE)
            .limit(2000)
            .paginate(cursor);
          allKeys.push(...result.page.map((d) => d.key));
          done = result.isDone;
          cursor = result.continueCursor;
          pages++;
          if (pages > 10) break;
        }
        expect(allKeys.length).toBe(total);
        expect(new Set(allKeys).size).toBe(total);
      });
    });
  });

  describe("rectangle edge-boundary behaviour", () => {
    test("point exactly on the north edge does not throw and returns a consistent result", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "north-edge",
          coordinates: { latitude: SF_RECTANGLE.north, longitude: -122.45 },
          filterKeys: { name: "NorthEdge" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(Array.isArray(result.page)).toBe(true);
      });
    });

    test("point exactly on the south edge does not throw and returns a consistent result", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "south-edge",
          coordinates: { latitude: SF_RECTANGLE.south, longitude: -122.45 },
          filterKeys: { name: "SouthEdge" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(Array.isArray(result.page)).toBe(true);
      });
    });

    test("point exactly on the west edge does not throw and returns a consistent result", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "west-edge",
          coordinates: { latitude: 37.75, longitude: SF_RECTANGLE.west },
          filterKeys: { name: "WestEdge" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(Array.isArray(result.page)).toBe(true);
      });
    });

    test("point exactly on the east edge does not throw and returns a consistent result", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "east-edge",
          coordinates: { latitude: 37.75, longitude: SF_RECTANGLE.east },
          filterKeys: { name: "EastEdge" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(Array.isArray(result.page)).toBe(true);
      });
    });

    test("point just outside the north edge is not returned", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "just-outside-north",
          coordinates: {
            latitude: SF_RECTANGLE.north + 0.001,
            longitude: -122.45,
          },
          filterKeys: { name: "JustOutsideNorth" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(result.page.map((d) => d.key)).not.toContain(
          "just-outside-north",
        );
      });
    });

    test("point just outside the south edge is not returned", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "just-outside-south",
          coordinates: {
            latitude: SF_RECTANGLE.south - 0.001,
            longitude: -122.45,
          },
          filterKeys: { name: "JustOutsideSouth" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .within(SF_RECTANGLE)
          .limit(10)
          .paginate();
        expect(result.page.map((d) => d.key)).not.toContain(
          "just-outside-south",
        );
      });
    });
  });
});

describe("points.query().nearest()", () => {
  describe("basic ordering and result shape", () => {
    test("the closest point is ranked first", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "very-close",
          coordinates: { latitude: 37.7501, longitude: -122.4501 },
          filterKeys: { name: "Very Close" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "far-away",
          coordinates: LONDON_POINT,
          filterKeys: { name: "Far Away" },
          sortKey: 2,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(2)
          .collect();
        expect(result.length).toBeGreaterThan(0);
        expect(result[0].key).toBe("very-close");
      });
    });

    test("results are ordered by non-decreasing distance from the query point", async () => {
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
          await geo.points.insert(ctx, { ...p, filterKeys: { name: p.key } });
        }
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(3)
          .collect();
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

    test("distances are non-decreasing across 20 nearest results", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        for (let i = 0; i < 20; i++) {
          await geo.points.insert(ctx, {
            key: `near-many-${i}`,
            coordinates: {
              latitude: 37.75 + i * 0.01,
              longitude: -122.45 + i * 0.005,
            },
            filterKeys: { name: `NearMany ${i}` },
            sortKey: i,
          });
        }
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(20)
          .collect();
        expect(result.length).toBeGreaterThan(1);
        for (let i = 1; i < result.length; i++) {
          expect(result[i].distance).toBeGreaterThanOrEqual(
            result[i - 1].distance,
          );
        }
      });
    });

    test("each result document exposes key, coordinates.latitude, coordinates.longitude, and distance", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "nearby",
          coordinates: { latitude: 37.7501, longitude: -122.4501 },
          filterKeys: { name: "Nearby" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(1)
          .collect();
        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty("key");
        expect(result[0].coordinates).toHaveProperty("latitude");
        expect(result[0].coordinates).toHaveProperty("longitude");
        expect(result[0]).toHaveProperty("distance");
      });
    });

    test("distance field is a non-negative number", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "close",
          coordinates: { latitude: 37.7501, longitude: -122.4501 },
          filterKeys: { name: "Close" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(1)
          .collect();
        expect(typeof result[0].distance).toBe("number");
        expect(result[0].distance).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("limit behaviour", () => {
    test("number of results never exceeds the limit parameter", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        for (let i = 0; i < 5; i++) {
          await geo.points.insert(ctx, {
            key: `near-${i}`,
            coordinates: {
              latitude: 37.75 + i * 0.001,
              longitude: -122.45 + i * 0.001,
            },
            filterKeys: { name: `Near ${i}` },
            sortKey: i,
          });
        }
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(3)
          .collect();
        expect(result.length).toBeLessThanOrEqual(3);
      });
    });

    test("fewer documents than the limit returns all available documents", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "only",
          coordinates: { latitude: 37.7501, longitude: -122.4501 },
          filterKeys: { name: "Only" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(100)
          .collect();
        expect(result).toHaveLength(1);
      });
    });

    test("limit of 0 returns an empty array without querying the index", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "some-point",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "SomePoint" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(0)
          .collect();
        expect(result).toEqual([]);
      });
    });

    test("returns an empty array when the index has no documents", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(5)
          .collect();
        expect(result).toEqual([]);
      });
    });
  });

  describe("maxDistance option", () => {
    test("excludes documents beyond the threshold distance", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "close",
          coordinates: { latitude: 37.7501, longitude: -122.4501 },
          filterKeys: { name: "Close" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "far",
          coordinates: LONDON_POINT,
          filterKeys: { name: "Far" },
          sortKey: 2,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT, { maxDistance: 1000 })
          .limit(10)
          .collect();
        const keys = result.map((d) => d.key);
        expect(keys).toContain("close");
        expect(keys).not.toContain("far");
      });
    });

    test("returns empty array when all documents are farther than maxDistance", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "london",
          coordinates: LONDON_POINT,
          filterKeys: { name: "London" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT, { maxDistance: 1000 })
          .limit(10)
          .collect();
        expect(result).toHaveLength(0);
      });
    });

    test("maxDistance of 0 returns no results", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "somewhere",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "Somewhere" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT, { maxDistance: 0 })
          .limit(10)
          .collect();
        expect(result).toHaveLength(0);
      });
    });

    test("boundary value at exactly maxDistance is handled consistently without throwing", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        // ~111m per 0.001° latitude; insert at roughly 100m away
        await geo.points.insert(ctx, {
          key: "boundary",
          coordinates: { latitude: 37.7509, longitude: -122.45 },
          filterKeys: { name: "Boundary" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT, { maxDistance: 100 })
          .limit(10)
          .collect();
        expect(Array.isArray(result)).toBe(true);
      });
    });
  });

  describe("filter()", () => {
    test("eq filter returns only documents matching the specified value", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "restaurant",
          coordinates: { latitude: 37.7502, longitude: -122.4502 },
          filterKeys: { name: "Restaurant" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "hotel",
          coordinates: { latitude: 37.7503, longitude: -122.4503 },
          filterKeys: { name: "Hotel" },
          sortKey: 2,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .filter((q) => q.eq("name", "Restaurant"))
          .limit(10)
          .collect();
        const keys = result.map((d) => d.key);
        expect(keys).toContain("restaurant");
        expect(keys).not.toContain("hotel");
      });
    });

    test("eq filter with no matching value returns an empty array", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "x",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "X" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .filter((q) => q.eq("name", "NoMatch"))
          .limit(10)
          .collect();
        expect(result).toHaveLength(0);
      });
    });

    test("in filter returns documents matching any value in the set", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "alpha",
          coordinates: { latitude: 37.7501, longitude: -122.4501 },
          filterKeys: { name: "Alpha" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "beta",
          coordinates: { latitude: 37.7502, longitude: -122.4502 },
          filterKeys: { name: "Beta" },
          sortKey: 2,
        });
        await geo.points.insert(ctx, {
          key: "gamma",
          coordinates: { latitude: 37.7503, longitude: -122.4503 },
          filterKeys: { name: "Gamma" },
          sortKey: 3,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .filter((q) => q.in("name", ["Alpha", "Beta"]))
          .limit(10)
          .collect();
        const keys = result.map((d) => d.key);
        expect(keys).toContain("alpha");
        expect(keys).toContain("beta");
        expect(keys).not.toContain("gamma");
      });
    });

    test("calling in() twice throws a 'multiple in clauses' error", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial<
          string,
          { name: string; category: string }
        >();
        await geo.points.insert(ctx, {
          key: "x",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "X", category: "Y" },
          sortKey: 1,
        });
        await expect(
          geo.points
            .query(ctx)
            .nearest(SF_POINT)
            .filter((q) => (q.in("name", ["X"]) as any).in("category", ["Y"]))
            .limit(10)
            .collect(),
        ).rejects.toThrow("multiple");
      });
    });

    test("gte + lt filters narrow nearest results to the specified sortKey range", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        for (let i = 1; i <= 5; i++) {
          await geo.points.insert(ctx, {
            key: `item-${i}`,
            coordinates: { latitude: 37.75 + i * 0.0001, longitude: -122.45 },
            filterKeys: { name: `Item ${i}` },
            sortKey: i,
          });
        }
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .filter((q) => q.gte("sortKey", 2).lt("sortKey", 4))
          .limit(10)
          .collect();
        const keys = result.map((d) => d.key);
        expect(keys).toContain("item-2");
        expect(keys).toContain("item-3");
        expect(keys).not.toContain("item-1");
        expect(keys).not.toContain("item-4");
        expect(keys).not.toContain("item-5");
      });
    });

    test("equal start and end bounds return an empty array", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "eq-bound-nearest",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "EqBound" },
          sortKey: 5,
        });
        // gte(5).lt(5) → startInclusive === endExclusive
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .filter((q) => q.gte("sortKey", 5).lt("sortKey", 5))
          .limit(10)
          .collect();
        expect(result).toEqual([]);
      });
    });

    test("inverted bounds (start > end) return an empty array", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "bad-interval-nearest",
          coordinates: SF_CITY_HALL,
          filterKeys: { name: "BadInterval" },
          sortKey: 5,
        });
        // gte(10).lt(5) → startInclusive=10 > endExclusive=5
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .filter((q) => q.gte("sortKey", 10).lt("sortKey", 5))
          .limit(10)
          .collect();
        expect(result).toEqual([]);
      });
    });
  });

  describe("maxDistance combined with filter()", () => {
    test("eq filter excludes documents that are close but do not match the filter value", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial<string, { category: string }>();
        await geo.points.insert(ctx, {
          key: "close-coffee",
          coordinates: { latitude: 37.7501, longitude: -122.4501 },
          filterKeys: { category: "coffee" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "close-hotel",
          coordinates: { latitude: 37.7502, longitude: -122.4502 },
          filterKeys: { category: "hotel" },
          sortKey: 2,
        });
        await geo.points.insert(ctx, {
          key: "far-coffee",
          coordinates: LONDON_POINT,
          filterKeys: { category: "coffee" },
          sortKey: 3,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT, { maxDistance: 1000 })
          .filter((q) => q.eq("category", "coffee"))
          .limit(10)
          .collect();
        const keys = result.map((d) => d.key);
        expect(keys).toContain("close-coffee");
        expect(keys).not.toContain("close-hotel");
        expect(keys).not.toContain("far-coffee");
      });
    });

    test("in filter excludes documents outside the distance or not in the set", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial<string, { category: string }>();
        await geo.points.insert(ctx, {
          key: "close-coffee",
          coordinates: { latitude: 37.7501, longitude: -122.4501 },
          filterKeys: { category: "coffee" },
          sortKey: 1,
        });
        await geo.points.insert(ctx, {
          key: "close-tea",
          coordinates: { latitude: 37.7502, longitude: -122.4502 },
          filterKeys: { category: "tea" },
          sortKey: 2,
        });
        await geo.points.insert(ctx, {
          key: "close-hotel",
          coordinates: { latitude: 37.7503, longitude: -122.4503 },
          filterKeys: { category: "hotel" },
          sortKey: 3,
        });
        await geo.points.insert(ctx, {
          key: "far-coffee",
          coordinates: LONDON_POINT,
          filterKeys: { category: "coffee" },
          sortKey: 4,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT, { maxDistance: 1000 })
          .filter((q) => q.in("category", ["coffee", "tea"]))
          .limit(10)
          .collect();
        const keys = result.map((d) => d.key);
        expect(keys).toContain("close-coffee");
        expect(keys).toContain("close-tea");
        expect(keys).not.toContain("close-hotel");
        expect(keys).not.toContain("far-coffee");
      });
    });

    test("gte + lt sortKey filter excludes documents outside either constraint", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "close-in-range",
          coordinates: { latitude: 37.7501, longitude: -122.4501 },
          filterKeys: { name: "A" },
          sortKey: 15,
        });
        await geo.points.insert(ctx, {
          key: "close-out-of-range",
          coordinates: { latitude: 37.7502, longitude: -122.4502 },
          filterKeys: { name: "B" },
          sortKey: 5,
        });
        await geo.points.insert(ctx, {
          key: "far-in-range",
          coordinates: LONDON_POINT,
          filterKeys: { name: "C" },
          sortKey: 15,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT, { maxDistance: 1000 })
          .filter((q) => q.gte("sortKey", 10).lt("sortKey", 30))
          .limit(10)
          .collect();
        const keys = result.map((d) => d.key);
        expect(keys).toContain("close-in-range");
        expect(keys).not.toContain("close-out-of-range");
        expect(keys).not.toContain("far-in-range");
      });
    });
  });

  describe("distance field accuracy", () => {
    test("distance to a point ~1 km away is approximately 1000 m (±20%)", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        // ~0.009° latitude ≈ 1 km
        await geo.points.insert(ctx, {
          key: "one-km",
          coordinates: { latitude: 37.759, longitude: -122.45 },
          filterKeys: { name: "OneKm" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(1)
          .collect();
        expect(result).toHaveLength(1);
        expect(result[0].distance).toBeGreaterThan(800);
        expect(result[0].distance).toBeLessThan(1200);
      });
    });

    test("distance to the exact query point is 0 or very close to 0", async () => {
      const t = initConvexTest();
      await t.run(async (ctx) => {
        const geo = await initGeospatial();
        await geo.points.insert(ctx, {
          key: "exact",
          coordinates: SF_POINT,
          filterKeys: { name: "Exact" },
          sortKey: 1,
        });
        const result = await geo.points
          .query(ctx)
          .nearest(SF_POINT)
          .limit(1)
          .collect();
        expect(result).toHaveLength(1);
        expect(result[0].distance).toBeCloseTo(0, 0);
      });
    });
  });
});
