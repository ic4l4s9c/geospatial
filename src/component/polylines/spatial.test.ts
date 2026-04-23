import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api.js";
import schema from "../schema.js";
import { modules } from "../test.setup.js";
import { type PolylineKey } from "../schema.js";

const SIMPLE_LINE = [
  { latitude: 0, longitude: 0 },
  { latitude: 0.5, longitude: 0.5 },
  { latitude: 1, longitude: 1 },
];

const DIAGONAL_LINE = [
  { latitude: 5, longitude: 5 },
  { latitude: 6, longitude: 6 },
];

describe("polyline queries", () => {
  describe("intersects", () => {
    test("finds polylines intersecting a rectangle", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_LINE,
          sortKey: 1,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.intersects, {
        query: {
          shape: {
            type: "rectangle",
            rectangle: { south: 4, north: 7, west: 4, east: 7 },
          },
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("diagonal");
    });

    test("finds polylines intersecting a point", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_LINE,
          sortKey: 1,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.intersects, {
        query: {
          shape: { type: "point", point: { latitude: 5.5, longitude: 5.5 } },
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
    });

    test("finds polylines intersecting a polygon", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_LINE,
          sortKey: 1,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.intersects, {
        query: {
          shape: {
            type: "polygon",
            polygon: {
              exterior: [
                { latitude: 5, longitude: 5 },
                { latitude: 5, longitude: 6 },
                { latitude: 6, longitude: 6 },
                { latitude: 6, longitude: 5 },
              ],
            },
          },
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("diagonal");
    });

    test("does not find non-intersecting polylines", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_LINE,
          sortKey: 1,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.intersects, {
        query: {
          shape: {
            type: "rectangle",
            rectangle: { south: 0, north: 1, west: 0, east: 1 },
          },
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(0);
    });

    test("intersects respects must filters", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "line-a" as PolylineKey,
          coordinates: SIMPLE_LINE,
          sortKey: 1,
          filterKeys: { type: "a" },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });
      await t.mutation(api.polylines.insert, {
        document: {
          key: "line-b" as PolylineKey,
          coordinates: SIMPLE_LINE,
          sortKey: 2,
          filterKeys: { type: "b" },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.intersects, {
        query: {
          shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
          filtering: [{ occur: "must", filterKey: "type", filterValue: "a" }],
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("line-a");
    });

    test("intersects returns continueCursor when more results", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 5; i++) {
        await t.mutation(api.polylines.insert, {
          document: {
            key: `line-${i}` as PolylineKey,
            coordinates: SIMPLE_LINE,
            sortKey: i,
          },
          config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
        });
      }

      const result = await t.query(api.polylines.spatial.intersects, {
        query: {
          shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
          limit: 2,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(2);
      expect(result.continueCursor).toBeTruthy();
    });

    test("intersects paginates with cursor", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 5; i++) {
        await t.mutation(api.polylines.insert, {
          document: {
            key: `line-${i}` as PolylineKey,
            coordinates: SIMPLE_LINE,
            sortKey: i,
          },
          config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
        });
      }

      const firstPage = await t.query(api.polylines.spatial.intersects, {
        query: {
          shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
          limit: 2,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const secondPage = await t.query(api.polylines.spatial.intersects, {
        query: {
          shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
          limit: 2,
        },
        cursor: firstPage.continueCursor,
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(secondPage.page).toHaveLength(2);
      expect(secondPage.page[0].key).toBe("line-2");
    });
  });

  describe("nearest", () => {
    test("finds nearest polyline to a point", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "simple" as PolylineKey,
          coordinates: SIMPLE_LINE,
          sortKey: 1,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });
      await t.mutation(api.polylines.insert, {
        document: {
          key: "diagonal" as PolylineKey,
          coordinates: DIAGONAL_LINE,
          sortKey: 2,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.nearest, {
        query: {
          point: { latitude: 0.1, longitude: 0.1 },
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page.length).toBeGreaterThan(0);
      expect(result.page[0].distance).toBeDefined();
    });

    test("returns closest polyline first", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "far-line" as PolylineKey,
          coordinates: DIAGONAL_LINE,
          sortKey: 2,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });
      await t.mutation(api.polylines.insert, {
        document: {
          key: "near-line" as PolylineKey,
          coordinates: SIMPLE_LINE,
          sortKey: 1,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.nearest, {
        query: {
          point: { latitude: 0, longitude: 0 },
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page[0].key).toBe("near-line");
    });

    test("returns distance 0 for point on polyline", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "simple" as PolylineKey,
          coordinates: SIMPLE_LINE,
          sortKey: 1,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.nearest, {
        query: {
          point: { latitude: 0.5, longitude: 0.5 },
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page[0].distance).toBe(0);
    });

    test("returns empty when no polylines within maxDistance", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "simple" as PolylineKey,
          coordinates: SIMPLE_LINE,
          sortKey: 1,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.nearest, {
        query: {
          point: { latitude: 2, longitude: 2 },
          maxDistance: 100000,
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(0);
    });

    test("respects maxDistance filter by returning only polylines within distance", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "far-line" as PolylineKey,
          coordinates: DIAGONAL_LINE,
          sortKey: 2,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });
      await t.mutation(api.polylines.insert, {
        document: {
          key: "near-line" as PolylineKey,
          coordinates: SIMPLE_LINE,
          sortKey: 1,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.nearest, {
        query: {
          point: { latitude: 0.5, longitude: 0.5 },
          maxDistance: 100000,
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("near-line");
    });

    test("nearest respects must filters", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polylines.insert, {
        document: {
          key: "line-a" as PolylineKey,
          coordinates: SIMPLE_LINE,
          sortKey: 1,
          filterKeys: { type: "a" },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });
      await t.mutation(api.polylines.insert, {
        document: {
          key: "line-b" as PolylineKey,
          coordinates: SIMPLE_LINE,
          sortKey: 2,
          filterKeys: { type: "b" },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const result = await t.query(api.polylines.spatial.nearest, {
        query: {
          point: { latitude: 0.5, longitude: 0.5 },
          filtering: [{ occur: "must", filterKey: "type", filterValue: "a" }],
          limit: 64,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("line-a");
    });

    test("nearest returns continueCursor when more results", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 5; i++) {
        await t.mutation(api.polylines.insert, {
          document: {
            key: `line-${i}` as PolylineKey,
            coordinates: SIMPLE_LINE,
            sortKey: i,
          },
          config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
        });
      }

      const result = await t.query(api.polylines.spatial.nearest, {
        query: {
          point: { latitude: 0.5, longitude: 0.5 },
          limit: 2,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(2);
      expect(result.continueCursor).toBeTruthy();
    });

    test("nearest paginates with cursor", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 5; i++) {
        await t.mutation(api.polylines.insert, {
          document: {
            key: `line-${i}` as PolylineKey,
            coordinates: SIMPLE_LINE,
            sortKey: i,
          },
          config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
        });
      }

      const firstPage = await t.query(api.polylines.spatial.nearest, {
        query: {
          point: { latitude: 0.5, longitude: 0.5 },
          limit: 2,
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const secondPage = await t.query(api.polylines.spatial.nearest, {
        query: {
          point: { latitude: 0.5, longitude: 0.5 },
          limit: 2,
        },
        cursor: firstPage.continueCursor,
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(secondPage.page).toHaveLength(2);
    });
  });
});
