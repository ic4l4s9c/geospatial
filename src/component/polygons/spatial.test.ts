import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import { api } from "../_generated/api.js";
import schema from "../schema.js";
import { modules } from "../test.setup.js";

const MANHATTAN_POLYGON = {
  exterior: [
    { latitude: 40.7, longitude: -74.02 },
    { latitude: 40.7, longitude: -73.97 },
    { latitude: 40.8, longitude: -73.93 },
    { latitude: 40.88, longitude: -73.93 },
    { latitude: 40.88, longitude: -73.94 },
    { latitude: 40.8, longitude: -74.01 },
  ],
};

const CENTRAL_PARK_POLYGON = {
  exterior: [
    { latitude: 40.7677, longitude: -73.9817 },
    { latitude: 40.7677, longitude: -73.9494 },
    { latitude: 40.8001, longitude: -73.9494 },
    { latitude: 40.8001, longitude: -73.9817 },
  ],
};

const UNIT_SQUARE_POLYGON = {
  exterior: [
    { latitude: 0, longitude: 0 },
    { latitude: 0, longitude: 1 },
    { latitude: 1, longitude: 1 },
    { latitude: 1, longitude: 0 },
  ],
};

describe("polygon queries", () => {
  describe("intersects", () => {
    test("finds polygons intersecting a rectangle", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "manhattan",
          coordinates: MANHATTAN_POLYGON,
          sortKey: 1,
        },
      });
      await t.mutation(api.polygons.insert, {
        document: {
          key: "central-park",
          coordinates: CENTRAL_PARK_POLYGON,
          sortKey: 2,
        },
      });

      const result = await t.query(api.polygons.spatial.intersects, {
        shape: {
          type: "rectangle",
          rectangle: { south: 40.75, north: 40.85, west: -74, east: -73.9 },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page.length).toBeGreaterThan(0);
    });

    test("finds polygons intersecting a point", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.intersects, {
        shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("unit-square");
    });

    test("finds polygons intersecting another polygon", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.intersects, {
        shape: {
          type: "polygon",
          polygon: {
            exterior: [
              { latitude: 0.25, longitude: 0.25 },
              { latitude: 0.25, longitude: 0.75 },
              { latitude: 0.75, longitude: 0.75 },
              { latitude: 0.75, longitude: 0.25 },
            ],
          },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("unit-square");
    });

    test("does not find non-intersecting polygons", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.intersects, {
        shape: {
          type: "rectangle",
          rectangle: { south: 10, north: 11, west: 10, east: 11 },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(0);
    });

    test("does not find polygons intersecting point outside", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.intersects, {
        shape: { type: "point", point: { latitude: 5, longitude: 5 } },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(0);
    });

    test("intersects respects must filters", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "polygon-a",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
          filterKeys: { type: "a" },
        },
      });
      await t.mutation(api.polygons.insert, {
        document: {
          key: "polygon-b",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 2,
          filterKeys: { type: "b" },
        },
      });

      const result = await t.query(api.polygons.spatial.intersects, {
        shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
        filtering: [{ occur: "must", filterKey: "type", filterValue: "a" }],
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("polygon-a");
    });

    test("intersects respects should filters", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "polygon-a",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
          filterKeys: { type: "a" },
        },
      });
      await t.mutation(api.polygons.insert, {
        document: {
          key: "polygon-b",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 2,
          filterKeys: { type: "b" },
        },
      });

      const result = await t.query(api.polygons.spatial.intersects, {
        shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
        filtering: [{ occur: "should", filterKey: "type", filterValue: "a" }],
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("polygon-a");
    });

    test("intersects returns continueCursor when more results", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 5; i++) {
        await t.mutation(api.polygons.insert, {
          document: {
            key: `polygon-${i}`,
            coordinates: UNIT_SQUARE_POLYGON,
            sortKey: i,
          },
        });
      }

      const result = await t.query(api.polygons.spatial.intersects, {
        shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
        limit: 2,
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(2);
      expect(result.continueCursor).toBeTruthy();
    });

    test("intersects paginates with cursor", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 5; i++) {
        await t.mutation(api.polygons.insert, {
          document: {
            key: `polygon-${i}`,
            coordinates: UNIT_SQUARE_POLYGON,
            sortKey: i,
          },
        });
      }

      const firstPage = await t.query(api.polygons.spatial.intersects, {
        shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
        limit: 2,
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const secondPage = await t.query(api.polygons.spatial.intersects, {
        shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
        limit: 2,
        cursor: firstPage.continueCursor,
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(secondPage.page).toHaveLength(2);
      expect(secondPage.page[0].key).toBe("polygon-2");
    });
  });

  describe("contains", () => {
    test("finds polygons containing a point", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.contains, {
        shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("unit-square");
    });

    test("does not find polygon not containing point", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.contains, {
        shape: { type: "point", point: { latitude: 5, longitude: 5 } },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(0);
    });

    test("finds polygons containing another polygon", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.contains, {
        shape: {
          type: "polygon",
          polygon: {
            exterior: [
              { latitude: 0.25, longitude: 0.25 },
              { latitude: 0.25, longitude: 0.75 },
              { latitude: 0.75, longitude: 0.75 },
              { latitude: 0.75, longitude: 0.25 },
            ],
          },
        },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("unit-square");
    });

    test("does not find polygons not containing query polygon", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.contains, {
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
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(0);
    });

    test("finds polygons containing point on edge", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.contains, {
        shape: { type: "point", point: { latitude: 0, longitude: 0.5 } },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("unit-square");
    });

    test("contains respects must filters", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "polygon-a",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
          filterKeys: { type: "a" },
        },
      });
      await t.mutation(api.polygons.insert, {
        document: {
          key: "polygon-b",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 2,
          filterKeys: { type: "b" },
        },
      });

      const result = await t.query(api.polygons.spatial.contains, {
        shape: { type: "point", point: { latitude: 0.5, longitude: 0.5 } },
        filtering: [{ occur: "must", filterKey: "type", filterValue: "a" }],
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("polygon-a");
    });
  });

  describe("nearest", () => {
    test("finds nearest polygon to a point", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });
      await t.mutation(api.polygons.insert, {
        document: {
          key: "manhattan",
          coordinates: MANHATTAN_POLYGON,
          sortKey: 2,
        },
      });

      const result = await t.query(api.polygons.spatial.nearest, {
        point: { latitude: 0.1, longitude: 0.1 },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page.length).toBeGreaterThan(0);
      expect(result.page[0].distance).toBeDefined();
    });

    test("returns closest polygon first", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "far-polygon",
          coordinates: {
            exterior: [
              { latitude: 10, longitude: 10 },
              { latitude: 10, longitude: 11 },
              { latitude: 11, longitude: 11 },
              { latitude: 11, longitude: 10 },
            ],
          },
          sortKey: 2,
        },
      });
      await t.mutation(api.polygons.insert, {
        document: {
          key: "near-polygon",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.nearest, {
        point: { latitude: 0, longitude: 0 },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page[0].key).toBe("near-polygon");
    });

    test("returns distance 0 for point inside polygon", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.nearest, {
        point: { latitude: 0.5, longitude: 0.5 },
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page[0].distance).toBe(0);
    });

    test("returns empty when no polygons within maxDistance", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "unit-square",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
        },
      });

      const result = await t.query(api.polygons.spatial.nearest, {
        point: { latitude: 2, longitude: 2 },
        maxDistance: 100000,
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(0);
    });

    test("nearest respects must filters", async () => {
      const t = convexTest(schema, modules);

      await t.mutation(api.polygons.insert, {
        document: {
          key: "polygon-a",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 1,
          filterKeys: { type: "a" },
        },
      });
      await t.mutation(api.polygons.insert, {
        document: {
          key: "polygon-b",
          coordinates: UNIT_SQUARE_POLYGON,
          sortKey: 2,
          filterKeys: { type: "b" },
        },
      });

      const result = await t.query(api.polygons.spatial.nearest, {
        point: { latitude: 0.5, longitude: 0.5 },
        filtering: [{ occur: "must", filterKey: "type", filterValue: "a" }],
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(1);
      expect(result.page[0].key).toBe("polygon-a");
    });

    test("nearest returns continueCursor when more results", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 5; i++) {
        await t.mutation(api.polygons.insert, {
          document: {
            key: `polygon-${i}`,
            coordinates: UNIT_SQUARE_POLYGON,
            sortKey: i,
          },
        });
      }

      const result = await t.query(api.polygons.spatial.nearest, {
        point: { latitude: 0.5, longitude: 0.5 },
        limit: 2,
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(result.page).toHaveLength(2);
      expect(result.continueCursor).toBeTruthy();
    });

    test("nearest paginates with cursor", async () => {
      const t = convexTest(schema, modules);

      for (let i = 0; i < 5; i++) {
        await t.mutation(api.polygons.insert, {
          document: {
            key: `polygon-${i}`,
            coordinates: UNIT_SQUARE_POLYGON,
            sortKey: i,
          },
        });
      }

      const firstPage = await t.query(api.polygons.spatial.nearest, {
        point: { latitude: 0.5, longitude: 0.5 },
        limit: 2,
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      const secondPage = await t.query(api.polygons.spatial.nearest, {
        point: { latitude: 0.5, longitude: 0.5 },
        limit: 2,
        cursor: firstPage.continueCursor,
        config: { minLevel: 4, maxLevel: 16, levelMod: 2, maxCells: 30 },
      });

      expect(secondPage.page).toHaveLength(2);
    });
  });
});
